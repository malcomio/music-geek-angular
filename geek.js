angular.module('geek', ['spotify'])
  .config(function (SpotifyProvider) {
  SpotifyProvider.setClientId('6e7388e0fab24447b832a4f0209c3929');
  SpotifyProvider.setRedirectUri('http://tata.dev/geek/callback.html');
  SpotifyProvider.setScope('playlist-read-private');

})
  .controller('geekController', ['$scope', '$http', '$sce', 'Spotify', function ($scope, $http, $sce, Spotify) {

    $scope.authenticated = false;

    $scope.playlists = []
    $scope.playlistsLookup = {};

    $http.get('data/playlists.json')
      .then(function(res){
        $scope.playlists = res.data.playlists;
        for (var i = 0, len = $scope.playlists.length; i < len; i++) {
          $scope.playlistsLookup[$scope.playlists[i].id] = $scope.playlists[i];
        }
      });


    $scope.scores = []
    $scope.scoresLookup = {};
    $http.get('data/scores.json')
      .then(function(res){
        $scope.scores = res.data.scores;
          for (var i = 0, len = $scope.scores.length; i < len; i++) {
          $scope.scoresLookup[$scope.scores[i].id] = $scope.scores[i];
        }
      });

    $scope.updatePlaylist = function () {
      $scope.loadedPlaylist = $scope.playlistsLookup[$scope.selectedPlaylist];

      Spotify.getPlaylist($scope.loadedPlaylist.user, $scope.loadedPlaylist.id).then(function (data) {
        console.log(data);

        $scope.playlist = data;
        $scope.tracks = data.tracks.items;

        for (var index in $scope.tracks) {
          $scope.tracks[index].hits = $scope.tracks[index].misses = $scope.tracks[index].maybes = 0;

          var track = $scope.tracks[index].track;

          if (track.id in $scope.scoresLookup) {
            $scope.tracks[index].hits = $scope.scoresLookup[track.id].hits;
            $scope.tracks[index].misses = $scope.scoresLookup[track.id].misses;
            $scope.tracks[index].maybes = $scope.scoresLookup[track.id].maybes;
          }
        }

        var embedUrl = "https://embed.spotify.com/?uri=spotify%3Auser%3A" + data.owner.id + "%3Aplaylist%3A" + data.id;

        $scope.embedUrl = $sce.trustAsResourceUrl(embedUrl);

      });
    };

    $scope.login = function () {
      Spotify.login().then(function (data) {

        $scope.authenticated = true;

        $scope.updatePlaylist();

      }, function () {
        console.log('didn\'t log in');
      })
    };

    $scope.hit = function(index) {
      $scope.tracks[index].hits++;

      var id = $scope.getTrackId(index)

      $scope.updateScores(id, 'hit');

    };

    $scope.miss = function(index) {
      $scope.tracks[index].misses++;

      var id = $scope.getTrackId(index)
      $scope.updateScores(id, 'miss');
    };

    $scope.maybe = function(index) {
      $scope.tracks[index].maybes++;

      var id = $scope.getTrackId(index)
      $scope.updateScores(id, 'maybe');
    };

    $scope.getTrackId = function(index) {
      return $scope.tracks[index].track.id;
    }

    $scope.updateScores = function(trackId, updateType) {
      $http({
        url: 'geek.php',
        method: "GET",
        params: {'id': trackId, type: updateType}
      });
    };

}]);

