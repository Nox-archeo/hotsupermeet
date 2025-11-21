/**
 * FORCE DEPLOYMENT - PHOTOS PRIVÉES
 *
 * Ce fichier force Render à redéployer avec les routes photos privées.
 *
 * Routes qui DOIVENT être disponibles après ce déploiement :
 * - POST /api/private-photos/send-request
 * - POST /api/private-photos/respond
 * - GET /api/private-photos/received
 * - GET /api/private-photos/sent
 *
 * Timestamp: 2025-11-21T18:35:00Z
 * Bug: Routes 404 car Render n'a pas redéployé les modifications de server.js
 * Fix: Force redéploiement avec ce nouveau fichier
 */

module.exports = {
  deployTimestamp: '2025-11-21T18:35:00Z',
  routes: [
    'POST /api/private-photos/send-request',
    'POST /api/private-photos/respond',
    'GET /api/private-photos/received',
    'GET /api/private-photos/sent',
  ],
  status: 'FORCING_DEPLOYMENT',
};
