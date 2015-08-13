angular.module('geek', ['spotify'])
  .config(function (SpotifyProvider) {
    SpotifyProvider.setClientId('6e7388e0fab24447b832a4f0209c3929');
    SpotifyProvider.setRedirectUri(window.location.origin + '/geek/callback.html');
    SpotifyProvider.setScope('playlist-read-private');

  })
  .controller('geekController', [
    '$scope', '$http', '$sce', 'Spotify',
    function ($scope, $http, $sce, Spotify) {

      $scope.authenticated = false;

      $scope.playlists = []
      $scope.playlistsLookup = {};

      $http.get('data/playlists.json')
        .then(function (res) {
          $scope.playlists = res.data.playlists;
          for (var i = 0, len = $scope.playlists.length; i < len; i++) {
            $scope.playlistsLookup[$scope.playlists[i].id] = $scope.playlists[i];
          }

          // Set the first playlist as selected by default.
          $scope.selectedPlaylist = $scope.playlists[0];

          $scope.updatePlaylist();
        });


      $scope.scores = []
      $scope.scoresLookup = {};
      $http.get('data/scores.json')
        .then(function (res) {
          $scope.scores = res.data.scores;
          for (var i = 0, len = $scope.scores.length; i < len; i++) {
            $scope.scoresLookup[$scope.scores[i].id] = $scope.scores[i];
          }
        });

      $scope.updatePlaylist = function (playlist) {

        if (typeof playlist === 'undefined') {
          playlist = $scope.selectedPlaylist;
        }

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

              if (track.id in $scope.scoresLookup) {
                $scope.tracks[index].hit = $scope.scoresLookup[track.id].hit;
                $scope.tracks[index].miss = $scope.scoresLookup[track.id].miss;
                $scope.tracks[index].maybe = $scope.scoresLookup[track.id].maybe;
              }
            }
          });
        }
      };

      $scope.login = function () {
        Spotify.login().then(function (data) {

          $scope.authenticated = true;

          $scope.updatePlaylist();

        }, function () {
          console.log('didn\'t log in');
        })
      };

      $scope.hit = function (index) {
        $scope.tracks[index].hit++;

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

      $scope.getTrackId = function (index) {
        return $scope.tracks[index].track.id;
      }

      $scope.updateScores = function (trackId, updateType) {
        $http({
          url: 'geek.php',
          method: "GET",
          params: {'id': trackId, type: updateType}
        });
      };

    }
  ]);

