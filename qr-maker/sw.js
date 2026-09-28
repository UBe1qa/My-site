/* QR 만들기 — 홈 화면 앱(웹앱)용 서비스 워커
   - 이 사이트 파일: 인터넷이 되면 항상 새로 받고(고친 내용이 바로 보이게), 끊기면 저장해 둔 것으로 열어요
   - 글꼴(Google Fonts): 한 번 받으면 저장해 둔 것을 먼저 써요
   사이트 파일 목록을 바꾸면 아래 VERSION 숫자를 하나 올려 주세요 */
var VERSION = 'qr-maker-v1';
var FONT_CACHE = 'qr-maker-fonts';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/settings.js',
  './assets/qr.js',
  './assets/app.js',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('./') : undefined);
      });
    }));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
          return res;
        });
      });
    }));
  }
});
