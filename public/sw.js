// HotMeet - Service Worker pour notifications push
const SW_VERSION = '1.0.0';
const CACHE_NAME = 'hotmeet-push-v1';

console.log('🔧 Service Worker HotMeet démarré - Version:', SW_VERSION);

// Installation du service worker
self.addEventListener('install', event => {
  console.log('📦 SW: Installation en cours...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ SW: Cache créé');
      // Forcer l'activation immédiate
      return self.skipWaiting();
    })
  );
});

// Activation du service worker
self.addEventListener('activate', event => {
  console.log('🚀 SW: Activation en cours...');

  event.waitUntil(
    // Nettoyer les anciens caches
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🧹 SW: Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Prendre le contrôle de toutes les pages
        return self.clients.claim();
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', event => {
  console.log('🔔 SW: Notification push reçue');

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.warn('⚠️ SW: Erreur parsing données push:', error);
    data = {
      title: 'HotMeet',
      body: 'Vous avez reçu une nouvelle notification',
      icon: '/images/logo-192.png',
    };
  }

  const title = data.title || 'HotMeet';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: data.icon || '/images/logo-192.png',
    badge: '/images/badge-72.png',
    tag: data.tag || 'hotmeet-notification',
    data: {
      url: data.url || '/',
      userId: data.userId,
      type: data.type,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Voir',
      },
      {
        action: 'close',
        title: 'Fermer',
      },
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
  };

  console.log('📤 SW: Affichage notification:', title, options);

  event.waitUntil(self.registration.showNotification(title, options));
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
  console.log(
    '👆 SW: Clic sur notification:',
    event.notification.tag,
    event.action
  );

  const notification = event.notification;
  const data = notification.data || {};

  // Fermer la notification
  notification.close();

  if (event.action === 'close') {
    console.log('❌ SW: Notification fermée');
    return;
  }

  // Action par défaut ou action 'open'
  const urlToOpen = data.url || '/';

  event.waitUntil(
    // Chercher si une fenêtre du site est déjà ouverte
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clientList => {
        // Si une fenêtre est déjà ouverte, la focuser et naviguer
        for (let client of clientList) {
          if (
            client.url.includes('hotsupermeet.com') ||
            client.url.includes('localhost')
          ) {
            console.log('🔍 SW: Fenêtre existante trouvée, focus + navigation');
            return client.focus().then(() => {
              // Envoyer un message pour naviguer vers la bonne page
              return client.postMessage({
                action: 'navigate',
                url: urlToOpen,
                notificationData: data,
              });
            });
          }
        }

        // Sinon, ouvrir une nouvelle fenêtre
        console.log('🆕 SW: Ouverture nouvelle fenêtre');
        const fullUrl = urlToOpen.startsWith('http')
          ? urlToOpen
          : `https://www.hotsupermeet.com${urlToOpen}`;

        return clients.openWindow(fullUrl);
      })
  );
});

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', event => {
  console.log('🔕 SW: Notification fermée:', event.notification.tag);

  // Analytics ou tracking si nécessaire
  const data = event.notification.data || {};
  if (data.type) {
    console.log(`📊 SW: Notification ${data.type} fermée sans interaction`);
  }
});

// Gestion des messages depuis les pages
self.addEventListener('message', event => {
  console.log('💬 SW: Message reçu:', event.data);

  const data = event.data;

  switch (data.action) {
    case 'skipWaiting':
      self.skipWaiting();
      break;

    case 'getVersion':
      event.ports[0].postMessage({
        version: SW_VERSION,
        timestamp: Date.now(),
      });
      break;

    case 'testNotification':
      self.registration.showNotification('Test HotMeet', {
        body: 'Notifications push activées avec succès !',
        icon: '/images/logo-192.png',
        tag: 'test-notification',
      });
      break;

    default:
      console.log('❓ SW: Action message non reconnue:', data.action);
  }
});

// Gestion des erreurs
self.addEventListener('error', event => {
  console.error('❌ SW: Erreur:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ SW: Promesse rejetée:', event.reason);
});

console.log('✅ SW: Service Worker HotMeet initialisé');
