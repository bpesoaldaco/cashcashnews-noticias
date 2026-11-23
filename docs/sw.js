/* Guarda la web para que abra rápido y sin conexión. Las noticias se piden
 * siempre a la red y, si no hay, se usan las últimas guardadas. */
var CACHE = 'cashcashnews-web-5';
var BASICO = ['./', 'index.html', 'app.css?v=3', 'app.js?v=3', 'logo.svg', 'brindis.mp3', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png',
  'datos/glosario.json', 'datos/inversores.json', 'datos/buscador_valores.txt'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASICO); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var propio = url.origin === location.origin;
  var noticias = url.hostname === 'raw.githubusercontent.com';
  if (!propio && !noticias) return;
  // Primero la red (noticias frescas y versión nueva de la web); si falla, lo guardado.
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: noticias }).then(function (r) { return r || caches.match('./'); });
  }));
});
