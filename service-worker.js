// Simple PWA service worker: precache core + runtime cache images/audio
const CACHE = 'maze-v1';
const CORE = [
  './', './index.html', './app.js',
  './config/exhibition.json',
  './pwa/manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  // Cache-first for images & audio (including cross-origin after first visit)
  if (/\.(png|jpg|jpeg|gif|webp|mp3|ogg|avif)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(()=> r))
    );
    return;
  }
  // Network-first fallback to cache
  e.respondWith(fetch(e.request).catch(()=> caches.match(e.request)));
});
