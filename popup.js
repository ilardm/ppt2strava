// -*- mode: js; js-indent-level: 2; -*-


function checkPPTTab(callback) {
  chrome.tabs.query(
    {active: true, currentWindow: true},
    function(tabs) {
      var tab = tabs[0];
      var url = tab.url;

      var parser = document.createElement('a');
      parser.href = url;

      if (parser.hostname == 'polarpersonaltrainer.com') {
        callback(tab);
      }
    }
  );
}


function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}


function queryTracks(callback) {
  chrome.tabs.query(
    {active: true, currentWindow: true},
    function(tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {action: 'queryTracks'},
        function(response) {
          if (!!callback) {
            callback(response);
          }
        }
      );
    }
  );
}


function displayTracks(tracks) {
  var tracksContainer = document.getElementById('tracks-container');

  for (id in tracks) {
    var track = tracks[id];

    // TODO: use template after track details retrieving
    var container = document.createElement('div');
    retrieveTrackDetails(track, container)
    container.innerText = track['title'];

    tracksContainer.appendChild(container);
  }
}


function retrieveTrackDetails(track, container) {
  // TODO: implement
}


document.addEventListener('DOMContentLoaded', function() {
  checkPPTTab(function onPPTTab(tab) {
    renderStatus('I\'m on PPT tab');

    queryTracks(displayTracks);
  });
});
