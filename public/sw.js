// Service Worker - PWA 离线缓存
const CACHE = 'yli-v3';
const ASSETS = [
  '/', '/index.html', '/manifest.json',
  '/icon-192.png', '/icon-512.png', '/maskable-512.png',
  '/vendor/lunar.js',
  '/js/common.js', '/js/wuxing-lunar.js', '/js/meihua.js', '/js/news.js', '/js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API 不缓存，走网络（失败时可回退）
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  // 静态资源：网络优先，离线回退缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/index.html', copy));
      return r;
    }).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match('/index.html')))
  );
});