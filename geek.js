var geekApp = angular.module('geek', ['spotify', 'ngRoute']);

geekApp.config(function (SpotifyProvider) {
  SpotifyProvider.setClientId('6e7388e0fab24447b832a4f0209c3929');
  SpotifyProvider.setRedirectUri(window.location.origin + '/geek/callback.html');
  SpotifyProvider.setScope('playlist-read-private');

})

geekApp.factory('ScoresService', function($http) {
  return {
    all: function() {
      return $http.get('data/scores.json');
    }
  };
});

geekApp.controller('geekController', [
  '$scope', '$http', '$sce', 'Spotify', 'ScoresService',
  function ($scope, $http, $sce, Spotify, ScoresService) {

    // Initialise scope variables.
    $scope.authenticated = false;
    $scope.playlists = [];
    $scope.playlistsLookup = {};
    $scope.scores = [];
    $scope.notifications = '';

    /**
     * Get all the playlists.
     */
    $scope.getPlaylists = function () {
      $http.get('data/playlists.json')
        .then(function (res) {
          $scope.playlists = res.data.playlists;
          for (var i = 0, len = $scope.playlists.length; i < len; i++) {
            $scope.playlistsLookup[$scope.playlists[i].id] = $scope.playlists[i];
          }

          // Set the first playlist as selected by default.
          $scope.selectedPlaylist = $scope.playlists[0];

          // Try to
          $scope.updatePlaylist($scope.selectedPlaylist);
        });
    };

    /**
     * Get all the scores.
     */
    $scope.getScores = function () {
      $http.get('data/scores.json')
        .then(function (res) {
          $scope.scores = res.data.scores;
        });
    };

    /**
     * React to a change of playlist.
     *
     * @param playlist
     */
    $scope.updatePlaylist = function (playlist) {

      // Update the embedded playlist.
      // TODO:
      if (typeof playlist === 'string') {
        playlist = $scope.playlistsLookup[playlist];
      }

      $scope.loadedPlaylist = playlist;


      var embedUrl = "https://embed.spotify.com/?uri=spotify%3Auser%3A" + playlist.owner.id + "%3Aplaylist%3A" + playlist.id;
      $scope.embedUrl = $sce.trustAsResourceUrl(embedUrl);


      if ($scope.authenticated) {
        Spotify.getPlaylist(playlist.owner.id, playlist.id).then(function (data) {

          $scope.playlist = data;
          $scope.tracks = data.tracks.items;

          for (var index in $scope.tracks) {
            $scope.tracks[index].hits = $scope.tracks[index].misses = $scope.tracks[index].maybes = 0;

            var track = $scope.tracks[index].track;

            // Get any existing scores for this track.
            if (track.id in $scope.scores) {
              var trackObject = $scope.scores[track.id];

              // Get the totals.
              if (typeof trackObject.hit !== 'undefined') {
                $scope.tracks[index].hits = Object.keys(trackObject.hit).length;
              }

              if (typeof trackObject.miss !== 'undefined') {
                $scope.tracks[index].misses = Object.keys(trackObject.miss).length;
              }

              if (typeof trackObject.maybe !== 'undefined') {
                $scope.tracks[index].maybes = Object.keys(trackObject.maybe).length;
              }

              if (typeof $scope.user !== 'undefined') {
                // Check if the current user has voted.
                if (trackObject.hasOwnProperty('hit') && trackObject.hit[$scope.user.id]) {
                  $scope.tracks[index].myVote = 'hit';
                }
                if (trackObject.hasOwnProperty('miss') && trackObject.miss[$scope.user.id]) {
                  $scope.tracks[index].myVote = 'miss';
                }
                if (trackObject.hasOwnProperty('maybe') && trackObject.maybe[$scope.user.id]) {
                  $scope.tracks[index].myVote = 'maybe';
                }
              }
            }
          }
        });
      }
    };

    /**
     * Add a playlist.
     *
     * @param {string} playlistUri
     *   The URI of the playlist, either as playlist link or Spotify URI.
     */
    $scope.addPlaylist = function (playlistUri) {
      $scope.notifications = '';
      var userId = '',
        playlistId = '';

      // Playlist link format: https://open.spotify.com/user/fuzzylogic1981/playlist/4IwLqPHReJDvdLa91n1NNV
      var playlistLink = playlistUri.split('/');
      if (playlistLink.length == 7) {
        userId = playlistLink[4];
        playlistId = playlistLink[6];
      }

      // Spotify URI format: spotify:user:fuzzylogic1981:playlist:4IwLqPHReJDvdLa91n1NNV

      var spotifyUri = playlistUri.split(':');
      if (spotifyUri.length == 5) {
        userId = spotifyUri[2];
        playlistId = spotifyUri[4];
      }

      Spotify.getPlaylist(userId, playlistId).then(function (playlist) {
        $scope.storePlaylist(playlist.id, userId, playlist.name);
      });
    };


    /**
     * Store a newly-added playlist.
     *
     * @param {string} playlistId
     *   The Spotify ID for the track.
     * @param {string} userId
     *   The Spotify user ID voting.
     * @param {string} playlistName
     *   hit, miss or maybe
     */
    $scope.storePlaylist = function (playlistId, userId, playlistName) {
      $http({
        url: 'addPlaylist.php',
        method: "GET",
        params: {
          id: playlistId,
          user: userId,
          name: playlistName
        }
      }).then(function (data) {

        switch (data.status) {
          case 201:
            $scope.notifications = "The playlist " + playlistName + " by " + userId + " has been added.";
            $scope.getPlaylists();
            break;

          case 200:
            $scope.notifications = "The playlist " + playlistName + " by " + userId + " is already on the list.";
        }

      });
    };


    /**
     * Log the user in to Spotify.
     */
    $scope.login = function () {
      Spotify.login().then(function () {

        Spotify.getCurrentUser().then(function (userData) {
          $scope.user = {
            'id': userData.id,
            'name': userData.display_name,
            'image': userData.images[0].url
          };


          // Now that we've logged in, we can build the playlist.
          $scope.updatePlaylist($scope.selectedPlaylist);
        });

        $scope.authenticated = true;

      }, function () {
        console.log('log in failed');
      })
    };

    /**
     * Get the track's spotify ID from its playlist position.
     *
     * @param {int} index
     *   The 0-based index of the track's position in the playlist.
     *
     * @returns string
     *   The Spotify ID for the track.
     */
    $scope.getTrackId = function (index) {
      return $scope.tracks[index].track.id;
    };

    /**
     * Count a vote for a track.
     *
     * @param {string} vote
     *   Hit, miss or maybe.
     *
     * @param {int} index
     *   The 0-based index of the track's position in the playlist.
     */
    $scope.score = function (vote, index) {
      $scope.tracks[index][vote]++;
      var id = $scope.getTrackId(index);
      $scope.updateScores(id, $scope.user.id, vote);

      $scope.tracks[index].myVote = vote;

      switch (vote) {
        case 'hit':
          $scope.tracks[index].hits++;
          break;

        case 'miss':
          $scope.tracks[index].misses++;
          break;

        case 'maybe':
          $scope.tracks[index].maybes++;
      }
    };

    /**
     * Persistently store a vote for a track.
     *
     * @param {string} trackId
     *   The Spotify ID for the track.
     * @param {string} userId
     *   The Spotify user ID voting.
     * @param {string} vote
     *   hit, miss or maybe
     */
    $scope.updateScores = function (trackId, userId, vote) {
      $http({
        url: 'updateScores.php',
        method: "GET",
        params: {
          id: trackId,
          user: userId,
          type: vote
        }
      }).then(function (data) {

      });
    };


    // Initialise the app.
    $scope.getPlaylists();
    $scope.getScores();
  }
]);



geekApp.controller('playlistsController', '$scope', '$http', '$sce', 'Spotify', function ($scope, $http, $sce, Spotify) {

});

geekApp.controller('resultsController', ['$scope', '$http', '$sce', 'Spotify', 'ScoresService', function ($scope, $http, $sce, Spotify, ScoresService) {
  
  var getScores = function(data, status) {
    var scores = [];
    $scope.sortedScores = [],
    $scope.scores = [];
    
    for (var index in data.scores) {
      var trackObject = data.scores[index];
      if (typeof trackObject.hit !== 'undefined') {
        trackObject.hits = Object.keys(trackObject.hit).length;
      }
      else {
        trackObject.hits = 0;
      }
      
      if (typeof trackObject.id !== 'undefined'){
        scores.push(trackObject);
        $scope.scores[trackObject.id] = trackObject.hits;
      }
      
      
    }
    
    var tracks = scores.sort(function(obj1, obj2) {
      return obj2.hits - obj1.hits;
    });
    
    for (var index2 in tracks) {
      Spotify.getTrack(tracks[index2].id).then(function (track) {
        $scope.sortedScores.push(track);
        
      });
    }
        
    
  };
  
  ScoresService.all().success(getScores);
  
}]);


geekApp.config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'voting.html',
      controller: 'geekController'
    })

    .when('/playlists', {
      templateUrl: 'playlists.html',
      controller: 'playlistsController'
    })

    .when('/results', {
      templateUrl: 'results.html',
      controller: 'resultsController',
    });

});

geekApp.controller('navController', function($scope, $location) {
  $scope.isActive = function(route) {
    return route === $location.path();
  }
});
