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
  _sendContentScriptMessage('transferTrack', {trackId: trackId}, null);
}


function onAuthBtnClick(ev) {
  var authUrl = [
    'https://www.strava.com/oauth/authorize?',
    'client_id=18858',
    '&response_type=code',
    '&redirect_uri=https://gpglidnnkdjjfhkoaomigiefilhmaljm.chromiumapp.org/strv-auth',
    '&scope=view_private,write',
  ].join('');

  chrome.identity.launchWebAuthFlow({
    'url': authUrl,
    'interactive': true
  }, function onAuthCallback(redirect_url) {
    console.log(redirect_url);
    var parser = document.createElement('a');
    parser.href = redirect_url;

    var query = parser.search
        .replace(/^\?/, '')
        .split('&')
        .reduce(function(a, i){
          kv = i.split('=');
          a[kv[0]] = kv[1];
          return a;
        }, {});

    if (query['error'] !== undefined) {
      console.error('unable to authorize: ', query['error']);
    } else {
      var code = query['code'];
      console.log('auth code: ' + code);

      _sendContentScriptMessage('oauth', {code: code}, function onAuthorised(data) {
        console.log('authorised', data);

        var authAsNode = document.getElementById('authorisedAs');
        authAsNode.innerHTML = data['athlete']['username'];
      });
    }
  });
}


function onUnAuthBtnClick(ev) {
  _sendContentScriptMessage('unoauth', {}, function onUnAuthorised(data) {
    console.log('unauthorised', data);

    var authAsNode = document.getElementById('authorisedAs');
    authAsNode.innerHTML = '';
  });
}


document.addEventListener('DOMContentLoaded', function() {
  checkPPTTab(function onPPTTab(tab) {
    renderStatus('I\'m on PPT tab');

    queryTracks(displayTracks);
  });

  document.getElementById('auth').addEventListener('click', onAuthBtnClick);
  document.getElementById('unauth').addEventListener('click', onUnAuthBtnClick);

  chrome.storage.local.get('oauth', function(data) {
    console.log('got', data);

    if (!!data['oauth']) {
      var authAsNode = document.getElementById('authorisedAs');
      authAsNode.innerHTML = data['oauth']['athlete']['username'];
    }
  })
});
