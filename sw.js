// Plan de financement — service worker
// VERSION : à augmenter (1.1, 1.2…) à chaque modification de l'appli,
// en même temps que APP_VERSION dans index.html.
const VERSION = '1.1';
const CACHE = 'plan-financement-' + VERSION;
const FICHIERS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Pages HTML : réseau d'abord (toute modif déployée est prise), cache si hors connexion
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(rep => {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copie));
          return rep;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Autres fichiers : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(req).then(enCache => {
      const reseau = fetch(req).then(rep => {
        if (rep && rep.status === 200) {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(req, copie));
        }
        return rep;
      }).catch(() => enCache);
      return enCache || reseau;
    })
  );
});
