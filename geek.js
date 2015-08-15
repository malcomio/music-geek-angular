angular.module('geek', ['spotify'])
  .config(function (SpotifyProvider) {
    SpotifyProvider.setClientId('6e7388e0fab24447b832a4f0209c3929');
    SpotifyProvider.setRedirectUri(window.location.origin + '/geek/callback.html');
    SpotifyProvider.setScope('playlist-read-private');

  })
  .controller('geekController', [
    '$scope', '$http', '$sce', 'Spotify',
    function ($scope, $http, $sce, Spotify) {

      // Initialise scope variables.
      $scope.authenticated = false;
      $scope.playlists = []
      $scope.playlistsLookup = {};
      $scope.scores = []
      $scope.scoresLookup = {};

      // Get all the playlists.
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

      // Get all the scores.
      $http.get('data/scores.json')
        .then(function (res) {
          $scope.scores = res.data.scores;
          for (var i = 0, len = $scope.scores.length; i < len; i++) {
            $scope.scoresLookup[$scope.scores[i].id] = $scope.scores[i];
          }
        });

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
              $scope.tracks[index].hit = $scope.tracks[index].miss = $scope.tracks[index].maybe = 0;

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
                  if (trackObject.hit[$scope.user.id]) {
                    $scope.tracks[index].myVote = 'hit';
                  }
                  if (trackObject.miss[$scope.user.id]) {
                    $scope.tracks[index].myVote = 'miss';
                  }
                  if (trackObject.maybe[$scope.user.id]) {
                    $scope.tracks[index].myVote = 'maybe';
                  }
                }
              }
            }
          });
        }
      };

      /**
       * Log the user in to Spotify.
       */
      $scope.login = function () {
        Spotify.login().then(function (data) {

          Spotify.getCurrentUser().then(function( userData) {
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
       * @param int index
       *   The 0-based index of the track's position in the playlist.
       *
       * @returns string
       *   The Spotify ID for the track.
       */
      $scope.getTrackId = function (index) {
        return $scope.tracks[index].track.id;
      }

      /**
       * Count a vote for a track.
       *
       * @param string vote
       *   Hit, miss or maybe.
       *
       * @param index
       *   The 0-based index of the track's position in the playlist.
       */
      $scope.score = function(vote, index) {
        $scope.tracks[index][vote]++;
        var id = $scope.getTrackId(index)
        $scope.updateScores(id, $scope.user.id, vote);

        $scope.tracks[index].myVote = vote;
      }

      /**
       * Persistently store a vote for a track.
       *
       * @param string trackId
       *   The Spotify ID for the track.
       * @param string userId
       *   The Spotify user ID voting.
       * @param string vote
       *   hit, miss or maybe
       */
      $scope.updateScores = function (trackId, userId, vote) {
        $http({
          url: 'updateScores.php',
          method: "GET",
          params: {
            'id': trackId,
            'user': userId,
            type: vote
          }
        }).then(function (data) {

        });
      };

    }
  ]);

