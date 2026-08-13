// ── Service worker de Lennyx ──────────────────────────────────────────────
// Objectif : une application installée qui démarre instantanément, fonctionne
// hors ligne, et se met à jour sans jamais servir un vieux code.
//
// L'ancienne version était en « cache d'abord » pour TOUT, y compris la page :
// une fois installée, elle pouvait resservir indéfiniment un bundle périmé.
// Trois stratégies distinctes règlent ça, chacune adaptée à ce qu'elle sert :
//
//   • navigation (la page elle-même) → RÉSEAU d'abord, cache en secours.
//     C'est ce qui garantit qu'une nouvelle version est prise en compte dès
//     qu'il y a du réseau, tout en restant utilisable hors ligne.
//   • fichiers versionnés (/assets/nom-a1b2c3d4.js) → CACHE d'abord.
//     Leur nom change à chaque build : ils sont immuables, donc jamais périmés.
//   • le reste (icônes, écrans de lancement) → cache, rafraîchi en arrière-plan.

// La version arrive dans l'URL d'enregistrement (`./sw.js?v=0.8.2`), elle-même
// alimentée par package.json à la compilation. Deux effets, tous deux voulus :
// l'URL change à chaque version, donc le navigateur réinstalle le worker ; et
// les caches sont nommés d'après elle, donc les anciens sont balayés. Aucune
// version à maintenir à la main ici — un oubli aurait laissé les utilisateurs
// installés sur du vieux code indéfiniment.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const SHELL = `lennyx-shell-${VERSION}`;
const ASSETS = `lennyx-assets-${VERSION}`;

/** Le strict minimum pour afficher quelque chose hors ligne. */
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      // Un seul fichier manquant ne doit pas faire échouer toute
      // l'installation : on ajoute au coup par coup.
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim())
      .then(() => notifyClients()),
  );
});

/** Prévient l'application qu'une nouvelle version vient de prendre la main. */
async function notifyClients() {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const c of clients) c.postMessage({ type: 'lennyx-updated', version: VERSION });
}

/** Un fichier au nom versionné par le build ne change jamais de contenu. */
const isImmutable = (url) => /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpe?g|svg)$/.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // ── La page : réseau d'abord ──
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          void caches.open(SHELL).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(async () => (await caches.match('./index.html')) ?? (await caches.match('./')) ?? Response.error()),
    );
    return;
  }

  // ── Fichiers immuables : cache d'abord, sans revalidation ──
  if (isImmutable(url)) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(ASSETS).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // ── Le reste : on sert le cache tout de suite, on rafraîchit derrière ──
  e.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(ASSETS).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit ?? Response.error());
      return hit ?? network;
    }),
  );
});

// Permet à l'application de forcer la bascule quand l'utilisateur accepte la
// mise à jour, sans attendre la fermeture de tous les onglets.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'lennyx-skip-waiting') void self.skipWaiting();
});
