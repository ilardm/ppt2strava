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


function _performRequest(method, url, data, onSuccess, onFailure) {
  var request = new XMLHttpRequest();

  request.addEventListener('error', function(ev) {
    if (!!onFailure) {
      onFailure(ev);
    }
  });
  request.addEventListener('abort', function(ev) {
    if (!!onFailure) {
      onFailure(ev);
    }
  });
  request.addEventListener('load', function(ev) {
    if (ev.target.status == 200) {
      if (!!onSuccess) {
        onSuccess(ev.target.responseXML);
      }
    } else {
      if (!!onFailure) {
        onFailure(ev);
      }
    }
  });

  request.open(method, url);
  request.send(data);
}


function retrieveTrackGpx(trackId, onSuccess, onFailure) {
  var formData = new FormData();
  formData.set('.action', 'gpx');
  formData.set('items.0.item', trackId);
  formData.set('items.0.itemType', 'OptimizedExercise');

  _performRequest(
    'POST', 'https://polarpersonaltrainer.com/user/calendar/index.gpx', formData,
    onSuccess, onFailure
  );
}


function retrieveExercise(trackId, onSuccess, onFailure) {
  var url = 'https://polarpersonaltrainer.com/user/calendar/item/exercise.xml';
  url += '?id=' + escape(trackId);

  _performRequest(
    'GET', url, null,
    onSuccess, onFailure
  );
}


var SAMPLES_KEYS = {
  0: 'hr',
  1: 'speed',
  3: 'altitude',
  10: 'distance',
}


function extractSamples(exercise) {
  // extract && parse samples
  var samplesMap = exercise.querySelector('object[name=result] map[name=samples]');
  var samplesMap = Array.prototype.reduce.call(samplesMap.children, function(map, valueNode) {
    var key = valueNode.getAttribute('key');
    key = SAMPLES_KEYS[key];
    var values = valueNode.innerHTML.split(',');
    map[key] = values.map(parseFloat);
    return map;
  }, {});

  console.log(samplesMap);

  var totalSamples = samplesMap['hr'].length;
  var samples = [];

  // remap samples
  for (var i = 0; i < totalSamples; ++i) {
    var row = {};
    for (var key in samplesMap) {
      row[key] = samplesMap[key][i];
    }
    samples.push(row);
  }

  return samples;
}

function mergeGpxExercise(gpx, exercise) {
  // work with copy of gpx
  var gpxClone = gpx.cloneNode(true);

  // fix gpx.metadata.time
  var metadataTimeNode = gpxClone.querySelector('metadata time');
  var exerciseTimeNode = exercise.querySelector('object prop[name=time]');
  metadataTimeNode.innerHTML = exerciseTimeNode.innerHTML;

  var samples = extractSamples(exercise);

  // calculate *real* exercise start:
  // exerciseTimeNode contains local to device time, which is not
  // synced with GPS in general case
  var lastTrkPtTimeNode = gpxClone.querySelector('trkseg:last-child trkpt:last-child time');
  var sampleTimestampStart = Date.parse(lastTrkPtTimeNode.innerHTML) / 1000;
  sampleTimestampStart -= samples.length;

  var trkNode = gpxClone.querySelector('trk');

  // merge

  var segments = Array.prototype.map.call(trkNode.children, function(trkseg, sidx) {
    var points = Array.prototype.map.call(trkseg.children, function(trkpt, pidx) {
      var ret = trkpt.cloneNode(true);

      var timeNode = ret.querySelector('time');
      var ptTimestamp = Date.parse(timeNode.innerHTML) / 1000;
      var sampleIdx = ptTimestamp - sampleTimestampStart;

      var hrSample = samples[sampleIdx-1]['hr'];

      var ext = document.createElement('extensions');
      var tpx = document.createElement('gpxtpx:TrackPointExtension');
      var tpxhr = document.createElement('gpxtpx:hr');

      tpxhr.innerHTML = hrSample;
      tpx.appendChild(tpxhr);
      ext.appendChild(tpx);

      ret.appendChild(ext);

      return ret;
    });

    var ret = trkseg.cloneNode();

    for (var i = 0; i < points.length; i++) {
      ret.appendChild(points[i]);
    }

    return ret;
  });

  var trkNodeClone = trkNode.cloneNode();

  for (var i = 0; i < segments.length; i++) {
    trkNodeClone.appendChild(segments[i]);
  }

  trkNode.parentNode.replaceChild(trkNodeClone, trkNode);

  // update schemas
  var gpxNode = gpxClone.querySelector('gpx');
  gpxNode.setAttribute('creator', 'ppt2strava crx');

  // cc-cv from strava's exported gpx track
  var schemaLocation = gpxNode.getAttribute('xsi:schemaLocation');
  schemaLocation += ['',        // leading space
                     'http://www.garmin.com/xmlschemas/GpxExtensions/v3',
                     'http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd',
                     'http://www.garmin.com/xmlschemas/TrackPointExtension/v1',
                     'http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd'].join(' ');
  gpxNode.setAttribute('xsi:schemaLocation', schemaLocation);
  gpxNode.setAttribute('xmlns:gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1');
  gpxNode.setAttribute('xmlns:gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3');

  return gpxClone;
}


function retrieveTrack(argsObj) {
  retrieveTrackGpx(argsObj.trackId, function onTrackGpxRetrieved(gpx) {
    console.log('gpx retrieved', gpx);

    retrieveExercise(argsObj.trackId, function onExerciseRetrieved(exercise) {
      console.log('exercise retrieved', exercise);

      var merged = mergeGpxExercise(gpx, exercise);
      console.log('merged gpx-exercise', merged);
    })
  });
}


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action == 'queryTracks') {
      sendResponse(queryTracks(document));
    } else if (request.action == 'retrieveTrack') {
      retrieveTrack(request.args);
    }
  }
);
