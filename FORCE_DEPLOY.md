# Force Deploy - Photos Privées

Force deployment to ensure private photo system is deployed on Render.

Timestamp: 2025-11-21 $(date)

## Système Photos Privées Inclus:

- ✅ server/models/PrivatePhotoRequest.js
- ✅ server/controllers/privatePhotoController.js
- ✅ server/routes/privatePhotos.js
- ✅ public/js/messages-photo.js
- ✅ Routes montées dans server.js

## Routes API à déployer:

- POST /api/private-photos/send-request
- POST /api/private-photos/respond
- GET /api/private-photos/my-requests
- GET /api/private-photos/my-received-requests
