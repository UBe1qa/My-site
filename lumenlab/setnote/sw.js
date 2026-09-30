/* SetNote service worker: keeps the app shell so the installed app opens without a connection.
   scripts/build-web.mjs writes a hash of the shipped files into VERSION, so every release is a new
   worker with its own cache; the browser installs it in the background and the next launch uses it. */
const VERSION = 'ca5d2476d668';
const SHELL = 'setnote-shell-' + VERSION;
const FONTS = 'setnote-fonts-v1';
const FILES = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL)
    .then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('setnote-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    /* the page is one file: every navigation in scope gets the cached shell, network only as a fallback */
    const key = req.mode === 'navigate' ? './' : req;
    e.respondWith(caches.open(SHELL).then(c => c.match(key, { ignoreSearch: true })).then(hit => hit || fetch(req)));
    return;
  }
  /* Google Fonts: cache what was used once so the numbers keep their typeface offline */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
});
