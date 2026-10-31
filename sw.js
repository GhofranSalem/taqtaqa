// طقطقة: يخلي الموقع يفتح من غير نت.
// الصفحة بتتجاب من النت الأول عشان أي تحديث يوصل، ولو مفيش نت بتتفتح من النسخة المحفوظة.
const CACHE = "taqtaqa-v58";
const FILES = [
  "./",
  "./index.html",
  "./en/",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./favicon.ico",
  "./assets/app.css",
  "./assets/boot.js",
  "./assets/board.js",
  "./assets/changelog.js",
  "./assets/data.js",
  "./assets/app.js",
  "./fonts/sans-400.woff2",
  "./fonts/sans-500.woff2",
  "./fonts/sans-700.woff2",
  "./fonts/serif-400.woff2",
  "./fonts/display-700.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // الصفحات والملفات بتتجاب جديدة دايما من السيرفر، والنسخة المحفوظة للطوارئ بس
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
