// HotMeet - Service Worker (basique)
// Ce fichier évite l'erreur 404 dans la console

self.addEventListener('install', function (event) {
  // Service Worker installé
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Service Worker activé
  return self.clients.claim();
});

// Pas de cache pour l'instant - juste pour éviter l'erreur 404
