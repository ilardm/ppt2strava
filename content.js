// -*- mode: js; js-indent-level: 2; -*-


function _parseSearch(search) {
  return search.substring(1).split('&').reduce(function(a, i) {
    var parts = i.split('=');
    a[parts[0]] = parts[1];
    return a;
  }, {});
}


function queryTracks(target) {
  if (window.location.pathname == '/user/calendar/item/analyze.ftl') {
    var search = _parseSearch(window.location.search);
    var trackId = search['id'];
    var title = document.querySelector('.primary-exe-topic span span span');

    var ret = {};
    ret[trackId] = {
      id: trackId,
      link: window.location.href,
      title: title.innerText,
    };

    return ret;
  }

  var links = target.querySelectorAll('.dashboard-container a.view-link');

  if (links.length == 0) {
    return {};
  }

  var tracks = Array.prototype.reduce.call(links, function map(a, i) {
    var link = i.href;
    var title = i.text;
    var id = _parseSearch(i.search)['id'];

    a[id] = {
      id: id,
      link: link,
      title: title,
    };

    return a;
  }, {})

  return tracks;
}


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action == 'queryTracks') {
      sendResponse(queryTracks(document));
    }
  }
);
