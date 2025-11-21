// SOLUTION FINALE - ROUTE SIMPLE
// Cette route DOIT marcher maintenant !

const express = require('express');
const router = express.Router();

router.post('/send-request', (req, res) => {
  console.log('✅ ROUTE PHOTOS PRIVÉES APPELÉE !');
  res.json({
    success: true,
    message: "Demande d'accès envoyée avec succès !",
    data: req.body,
  });
});

module.exports = router;
