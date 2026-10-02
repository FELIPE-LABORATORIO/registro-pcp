/* Faz o app abrir sem internet.
   - Página e listas: tenta buscar a versão nova; sem sinal, usa a guardada.
   - Demais arquivos: usa a cópia guardada no celular. */
var CACHE = 'registro-pcp-v2';
var ARQUIVOS = [
  './',
  './index.html',
  './listas.js',
  './xlsx.mini.min.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ARQUIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (chaves) {
        return Promise.all(chaves.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function comPrazo(promessa, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error('prazo')); }, ms);
    promessa.then(function (r) { clearTimeout(t); resolve(r); },
                  function (err) { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var primeiroRede = req.mode === 'navigate' ||
    /\/(index\.html|listas\.js)$/.test(url.pathname) ||
    url.pathname.slice(-1) === '/';

  if (primeiroRede) {
    e.respondWith(
      comPrazo(fetch(req, { cache: 'no-cache' }), 4000)
        .then(function (resp) {
          if (resp && resp.ok) {
            var copia = resp.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copia); });
          }
          return resp;
        })
        .catch(function () {
          return caches.match(req, { ignoreSearch: true }).then(function (r) {
            return r || caches.match('./index.html');
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          var copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resp;
      });
    })
  );
});
