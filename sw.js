/* Viaje BA — service worker
   Sube la versión cada vez que cambies index.html: así el celular se entera y actualiza. */
const VERSION = 'viaje-ba-v9';
const ARMAZON = [
  './',
  './index.html',
  './manifest.json',
  './iconos/jsg-192.png',
  './iconos/jsg-512.png',
  './iconos/jsg-180.png',
  './iconos/jsg-32.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ARMAZON))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Las cotizaciones nunca se guardan: o son de ahora, o la app usa su propia copia.
  if (url.origin !== self.location.origin) return;

  // La página: primero la red, para que los cambios lleguen; si no hay, la copia guardada.
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then(r => {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copia));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // El resto (íconos, manifest): copia guardada primero, y se refresca por detrás.
  ev.respondWith(
    caches.match(req).then(hit => {
      const red = fetch(req).then(r => {
        if (r && r.status === 200) {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
