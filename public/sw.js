/*
 * MankindFactory · Service Worker
 * Estrategia: app-shell con cache-first para navegación (funciona offline) y
 * stale-while-revalidate para los assets con hash de Vite. Los datos del coach
 * NO pasan por aquí: viven en localStorage, no se cachean ni se exponen.
 */
const CACHE = 'mankind-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/brand/mankind-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no tocar CDNs (fonts, etc.)

  // Navegación: CACHÉ primero (arranque instantáneo, clave para el APK) con
  // revalidación en segundo plano — la próxima apertura ya trae lo nuevo.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', copy));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Assets (JS/CSS/img con hash): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
