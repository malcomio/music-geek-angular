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
          $scope.updatePlaylist();
        });

      // Get all the scores.
      $http.get('data/scores.json')
        .then(function (res) {
          console.log(res);
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

        if (typeof playlist === 'undefined') {
          playlist = $scope.selectedPlaylist;
        }

        // Update the embedded playlist.
        var embedUrl = "https://embed.spotify.com/?uri=spotify%3Auser%3A" + playlist.owner.id + "%3Aplaylist%3A" + playlist.id;
        $scope.embedUrl = $sce.trustAsResourceUrl(embedUrl);

        $scope.loadedPlaylist = $scope.playlistsLookup[playlist];

        if ($scope.authenticated) {

          Spotify.getPlaylist(playlist.owner.id, playlist.id).then(function (data) {
            console.log(data);

            $scope.playlist = data;
            $scope.tracks = data.tracks.items;

            for (var index in $scope.tracks) {
              $scope.tracks[index].hit = $scope.tracks[index].miss = $scope.tracks[index].maybe = 0;

              var track = $scope.tracks[index].track;

              // Get any existing scores for this track.
              if (track.id in $scope.scoresLookup) {
                $scope.tracks[index].hit = $scope.scoresLookup[track.id].hit;
                $scope.tracks[index].miss = $scope.scoresLookup[track.id].miss;
                $scope.tracks[index].maybe = $scope.scoresLookup[track.id].maybe;
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
          });

          console.log($scope.user);
          $scope.authenticated = true;

          // Now that we've logged in, we can build the playlist.
          $scope.updatePlaylist();

        }, function () {
          console.log('log in failed');
        })
      };

      $scope.hit = function (index) {
        $scope.tracks[index].hit++;
        $scope.votes[index] = true;
        var id = $scope.getTrackId(index)
        $scope.updateScores(id, 'hit');
      };

      $scope.miss = function (index) {
        $scope.tracks[index].miss++;
        var id = $scope.getTrackId(index)
        $scope.updateScores(id, 'miss');
      };

      $scope.maybe = function (index) {
        $scope.tracks[index].maybe++;
        var id = $scope.getTrackId(index)
        $scope.updateScores(id, 'maybe');
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
       * Persistently score a vote for a track.
       *
       * @param string trackId
       *   The Spotify ID for the track.
       * @param string updateType
       *   hit, miss or maybe
       */
      $scope.updateScores = function (trackId, updateType) {
        $http({
          url: 'updateScores.php',
          method: "GET",
          params: {'id': trackId, type: updateType}
        });
      };

    }
  ]);

