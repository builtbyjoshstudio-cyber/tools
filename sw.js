/* =========================================================
   TYNKR SERVICE WORKER — offline support for tools.builtbyjoshstudio.com
   · HTML and same-origin CSS/JS: network-first, so markup and the code that
     styles it always ship from the same deploy; the cache is the offline fallback
   · Images and Google Fonts: stale-while-revalidate
   · Anything else (analytics, other origins) is left to the browser
   Registered from kinetic.js. Bump CACHE_VERSION to drop stale caches.
   ========================================================= */
(function () {
  var CACHE_VERSION = 'v1';
  var PAGES = 'tynkr-pages-' + CACHE_VERSION;
  var ASSETS = 'tynkr-assets-' + CACHE_VERSION;
  var KEEP = [PAGES, ASSETS];

  /* Smallest shell that can still render offline: the kitchen hub — which is
     also the manifest start_url — plus the CSS and JS every page shares. */
  var SHELL_PAGES = ['/'];
  var SHELL_ASSETS = ['/kinetic.css', '/kinetic.js'];

  var CODE = /\.(css|js)$/;
  var FONT_HOSTS = /^fonts\.(googleapis|gstatic)\.com$/;

  self.addEventListener('install', function (e) {
    e.waitUntil(
      Promise.all([
        caches.open(PAGES).then(function (c) { return c.addAll(SHELL_PAGES); }),
        caches.open(ASSETS).then(function (c) { return c.addAll(SHELL_ASSETS); })
      ]).then(function () { return self.skipWaiting(); })
    );
  });

  self.addEventListener('activate', function (e) {
    e.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf('tynkr-') === 0 && KEEP.indexOf(k) < 0) return caches.delete(k);
        }));
      }).then(function () { return self.clients.claim(); })
    );
  });

  /* ---- network-first: the live site wins, the cache covers the offline case ----
     ignoreSearch on the lookup so a shared or cross-tool handoff link
     (?weight=12&unit=lbs) still finds the page it was cached under. */
  function networkFirst(e, req, cacheName) {
    return fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        e.waitUntil(caches.open(cacheName).then(function (c) { return c.put(req, copy); }));
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return req.mode === 'navigate' ? offline() : Response.error();
      });
    });
  }

  /* ---- stale-while-revalidate: instant from cache, refreshed in the background ---- */
  function staleWhileRevalidate(e, req) {
    return caches.open(ASSETS).then(function (cache) {
      return cache.match(req).then(function (hit) {
        var fresh = fetch(req).then(function (res) {
          // opaque = a no-cors font stylesheet; still usable, so keep it
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(function () { return hit || Response.error(); });
        if (hit) { e.waitUntil(fresh); return hit; }
        return fresh;
      });
    });
  }

  /* ---- shown when an uncached page is opened with no network ---- */
  function offline() {
    return new Response(
      '<!doctype html><html lang="en"><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Offline &mdash; Tynkr Tools &amp; Co</title>' +
      '<body style="margin:0;background:#0c0c0f;color:#e8e8ea;' +
      'font:16px/1.6 system-ui,-apple-system,sans-serif">' +
      '<main style="max-width:34rem;margin:0 auto;padding:3rem 1.5rem">' +
      '<h1 style="font-size:1.5rem;margin:0 0 .75rem">You are offline</h1>' +
      '<p style="margin:0 0 1.5rem;opacity:.85">This page has not been opened on this ' +
      'device yet, so there is no saved copy to show. Tools you have already used ' +
      'still work offline.</p>' +
      '<p style="margin:0"><a href="/" style="color:inherit">Go to the tools home page</a></p>' +
      '</main>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);
    var sameOrigin = url.origin === self.location.origin;

    if (req.mode === 'navigate') { e.respondWith(networkFirst(e, req, PAGES)); return; }
    if (sameOrigin && CODE.test(url.pathname)) { e.respondWith(networkFirst(e, req, ASSETS)); return; }
    if (sameOrigin || FONT_HOSTS.test(url.hostname)) { e.respondWith(staleWhileRevalidate(e, req)); }
  });
})();
