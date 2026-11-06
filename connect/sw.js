// Connect service worker. Keeps the whole app (hub + member area) on the phone so it opens with no internet.
// Pages and scripts: network first (4s), then the saved copy. Member data is kept by the app itself (IndexedDB) and synced when online.
var CACHE = "connect-v2";
var FILES = [
  "./", "./index.html", "./i18n.js", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./icon-180.png",
  "./member/", "./member/index.html", "./member/config.js", "./member/qrcode.js", "./member/art.js", "./member/learn.js", "./member/app.js"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(new Request(f, { cache: "reload" })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function fallback(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (m) {
    if (m) return m;
    if (req.mode === "navigate") return caches.match(/\/member\//.test(new URL(req.url).pathname) ? "./member/index.html" : "./index.html");
    return Response.error();
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; resolve(fallback(req)); } }, 4000);
    fetch(req).then(function (r) {
      if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      if (!done) { done = true; clearTimeout(timer); resolve(r); }
    }).catch(function () { if (!done) { done = true; clearTimeout(timer); resolve(fallback(req)); } });
  }));
});
