// Middleware de blocage géographique par IP
const blockedCountries = ['DZ', 'BJ', 'CI', 'CM']; // Algeria, Benin, Côte d'Ivoire, Cameroun

app.use('/api/auth/register', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  // En production, utiliser un service de géolocalisation IP
  // Exemple : https://ipapi.co/${ip}/country_code/

  console.log('🛡️ Vérification IP inscription:', ip);

  // Pour le moment, laisser passer (à activer plus tard)
  next();
});
