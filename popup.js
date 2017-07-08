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


function _sendContentScriptMessage(action, args, callback) {
  chrome.tabs.query(
    {active: true, currentWindow: true},
    function(tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {action: action, args: args},
        function(response) {
          if (!!callback) {
            callback(response);
          }
        }
      );
    }
  );
}

function queryTracks(callback) {
  return _sendContentScriptMessage('queryTracks', {}, callback);
}


function displayTracks(tracks) {
  var tracksContainer = document.getElementById('tracks-container');

  for (id in tracks) {
    var track = tracks[id];

    // TODO: use template after track details retrieving
    var container = document.createElement('div');

    var trackTitle = document.createElement('span');
    trackTitle.innerText = track['title'];
    container.appendChild(trackTitle);

    var transferBtn = document.createElement('input');
    transferBtn.setAttribute('type', 'button');
    transferBtn.setAttribute('value', 'Transfer');
    transferBtn.addEventListener('click', onTransferBtnClick.bind(null, id));
    container.appendChild(transferBtn);

    tracksContainer.appendChild(container);
  }
}


function onTransferBtnClick(trackId, ev) {
  _sendContentScriptMessage('retrieveTrack', {trackId: trackId}, null);
}


document.addEventListener('DOMContentLoaded', function() {
  checkPPTTab(function onPPTTab(tab) {
    renderStatus('I\'m on PPT tab');

    queryTracks(displayTracks);
  });
});
