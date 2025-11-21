# DEPLOY TRIGGER

Date: 2025-11-21
Fix: Route directe photos privées ajoutée dans server.js

## Modification apportée:

Route POST /api/private-photos/send-request créée directement dans server.js pour résoudre le problème 404.

## Impact:

- Résout immédiatement l'erreur 404
- Le bouton "demander l'accès" fonctionnera après ce déploiement

## Timestamp:

<?php echo date('Y-m-d H:i:s'); ?>
