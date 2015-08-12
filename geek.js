angular.module('geek', ['spotify'])
  .config(function (SpotifyProvider) {
  SpotifyProvider.setClientId('6e7388e0fab24447b832a4f0209c3929');
  SpotifyProvider.setRedirectUri('http://localhost:63342/geek/callback.html');
  SpotifyProvider.setScope('playlist-read-private');

})
  .controller('geekController', ['$scope', '$sce', 'Spotify', function ($scope, $sce, Spotify) {

    $scope.authenticated = false;

    $scope.playlists = [
      {user: 'overload74', id: '1Skbt2wll5trx5yHKzjrMt', name: 'May 2015'},
      {user: 'overload74', id: '3uHRcW7iw4Q2rwvZv3Ovv4', name: 'June 2015'},
      {user: 'overload74', id: '6M8VU8JnWD05Q9n9qZkrn9', name: 'July 2015'}
    ]

    $scope.playlistsLookup = {};

    for (var i = 0, len = $scope.playlists.length; i < len; i++) {
      $scope.playlistsLookup[$scope.playlists[i].id] = $scope.playlists[i];
    }

    $scope.updatePlaylist = function () {
      $scope.loadedPlaylist = $scope.playlistsLookup[$scope.selectedPlaylist];

      Spotify.getPlaylist($scope.loadedPlaylist.user, $scope.loadedPlaylist.id).then(function (data) {
        console.log(data);

        $scope.playlist = data;
        $scope.tracks = data.tracks.items;

        for (var index in $scope.tracks) {
          $scope.tracks[index].hits = $scope.tracks[index].misses = $scope.tracks[index].maybes = 0;
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

    $scope.hit = function(trackId) {
      $scope.tracks[trackId].hits++;
    };

    $scope.miss = function(trackId) {
      $scope.tracks[trackId].misses++;
    };

    $scope.maybe = function(trackId) {
      $scope.tracks[trackId].maybes++;
    };



}]);

