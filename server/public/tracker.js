(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('tracker.js') !== -1) {
        script = scripts[i];
        break;
      }
    }
  }

  if (!script) return;

  var siteId = script.getAttribute('data-site-id');
  if (!siteId) {
    console.warn('[MatuAnalytics] Missing data-site-id attribute');
    return;
  }

  var API_BASE = script.src.replace(/\/tracker\.js.*$/, '');
  var DEDUPE_MS = 30000;
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var HEARTBEAT_MS = 10000;

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function storageGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function storageSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) { /* ignore */ }
  }

  function localGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function localSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* ignore */ }
  }

  function getVisitorId() {
    var key = '_ma_vid';
    var id = localGet(key);
    if (!id) {
      id = generateId();
      localSet(key, id);
    }
    return id;
  }

  function getSessionId() {
    var sidKey = '_ma_sid';
    var activityKey = '_ma_last';
    var now = Date.now();
    var id = storageGet(sidKey);
    var lastActivity = parseInt(storageGet(activityKey) || '0', 10);

    if (id && lastActivity && now - lastActivity < SESSION_TIMEOUT_MS) {
      storageSet(activityKey, String(now));
      return id;
    }

    id = generateId();
    storageSet(sidKey, id);
    storageSet('_ma_sst', String(now));
    storageSet(activityKey, String(now));
    return id;
  }

  function getSessionStartTime() {
    var key = '_ma_sst';
    var t = storageGet(key);
    if (!t) {
      t = String(Date.now());
      storageSet(key, t);
    }
    return parseInt(t, 10);
  }

  function touchSession() {
    storageSet('_ma_last', String(Date.now()));
  }

  function shouldRecordPageview(url) {
    var key = '_ma_lpv';
    var now = Date.now();
    var raw = storageGet(key);
    if (raw) {
      try {
        var last = JSON.parse(raw);
        if (last.url === url && now - last.ts < DEDUPE_MS) {
          return false;
        }
      } catch (e) { /* ignore */ }
    }
    storageSet(key, JSON.stringify({ url: url, ts: now }));
    return true;
  }

  function detectBrowser() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    return 'Other';
  }

  function detectOS() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Other';
  }

  function detectDevice() {
    var ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  function getPageData() {
    return {
      url: window.location.href,
      title: document.title || '',
      browser: detectBrowser(),
      os: detectOS(),
      device: detectDevice(),
      screenResolution: window.screen.width + 'x' + window.screen.height,
      language: navigator.language || '',
      referer: document.referrer || '',
    };
  }

  function postJSON(endpoint, data) {
    return fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
      mode: 'cors',
    }).then(function (res) {
      if (!res.ok) {
        console.warn('[MatuAnalytics] Request failed:', endpoint, res.status);
      }
      return res;
    }).catch(function (err) {
      console.warn('[MatuAnalytics] Network error:', endpoint, err.message || err);
    });
  }

  var visitorId = getVisitorId();
  var sessionId = getSessionId();
  var sessionStartTime = getSessionStartTime();
  var pageData = getPageData();
  var socket = null;
  var heartbeatInterval = null;
  var projectId = storageGet('_ma_pid');
  var geoData = {};
  var registering = false;

  function getDuration() {
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }

  function track(skipPageview) {
    touchSession();
    var payload = Object.assign(
      { siteId: siteId, visitorId: visitorId, sessionId: sessionId, skipPageview: !!skipPageview },
      pageData
    );

    return postJSON('/api/track', payload).then(function (res) {
      if (res && res.ok) {
        return res.json();
      }
    }).then(function (data) {
      if (data && data.projectId) {
        projectId = data.projectId;
        storageSet('_ma_pid', projectId);
        if (data.geo) geoData = data.geo;
        connectSocket();
      }
    });
  }

  function connectSocket() {
    if (!projectId) return;

    if (typeof io === 'undefined') {
      loadSocketIO(connectSocket);
      return;
    }

    if (socket && socket.connected) {
      registerVisitor();
      return;
    }

    if (socket) {
      socket.disconnect();
    }

    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', function () {
      registerVisitor();
      startHeartbeat();
    });
  }

  function registerVisitor() {
    if (!socket || !projectId || registering) return;
    registering = true;
    socket.emit('visitor_register', Object.assign(
      {
        projectId: projectId,
        visitorId: visitorId,
        sessionId: sessionId,
        sessionStartedAt: sessionStartTime,
      },
      pageData,
      geoData
    ));
    setTimeout(function () { registering = false; }, 500);
  }

  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(function () {
      touchSession();
      var current = getPageData();
      var duration = getDuration();
      postJSON('/api/heartbeat', {
        siteId: siteId,
        sessionId: sessionId,
        visitorId: visitorId,
        url: current.url,
        title: current.title,
        duration: duration,
        browser: current.browser,
        os: current.os,
        device: current.device,
      });
      if (socket && socket.connected) {
        socket.emit('heartbeat', {
          projectId: projectId,
          sessionId: sessionId,
          pageUrl: current.url,
          pageTitle: current.title,
          durationSeconds: duration,
        });
      }
    }, HEARTBEAT_MS);
  }

  function loadSocketIO(callback) {
    if (document.querySelector('script[data-ma-socket]')) {
      setTimeout(callback, 200);
      return;
    }
    var s = document.createElement('script');
    s.src = API_BASE + '/socket.io/socket.io.js';
    s.setAttribute('data-ma-socket', '1');
    s.onload = callback;
    s.onerror = function () {
      console.warn('[MatuAnalytics] Could not load Socket.IO client');
    };
    document.head.appendChild(s);
  }

  function onPageChange() {
    touchSession();
    pageData = getPageData();
    if (!shouldRecordPageview(pageData.url)) {
      if (socket && socket.connected && projectId) {
        socket.emit('heartbeat', {
          projectId: projectId,
          sessionId: sessionId,
          pageUrl: pageData.url,
          pageTitle: pageData.title,
          durationSeconds: getDuration(),
        });
      }
      return;
    }
    postJSON('/api/track', Object.assign(
      { siteId: siteId, visitorId: visitorId, sessionId: sessionId },
      pageData
    )).then(function (res) {
      if (res && res.ok) return res.json();
    }).then(function (data) {
      if (data && data.geo) geoData = data.geo;
    });
    if (socket && socket.connected && projectId) {
      socket.emit('page_view', {
        projectId: projectId,
        sessionId: sessionId,
        pageUrl: pageData.url,
        pageTitle: pageData.title,
      });
    }
  }

  var pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(history, arguments);
    onPageChange();
  };
  window.addEventListener('popstate', onPageChange);

  window.addEventListener('pagehide', function () {
    postJSON('/api/heartbeat', {
      siteId: siteId,
      sessionId: sessionId,
      visitorId: visitorId,
      url: pageData.url,
      title: pageData.title,
      duration: getDuration(),
    });
  });

  function init() {
    var recordPageview = shouldRecordPageview(pageData.url);
    track(!recordPageview);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
