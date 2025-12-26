// Script pour supprimer les comptes suspects
// ATTENTION : UTILISER AVEC PRÉCAUTION !

const suspiciousEmails = [
  '@yahoo.com',
  '@hotmail.com',
  'doctor',
  'money',
  'rich',
  'love',
  'prince',
];

const suspiciousCountries = ['benin', 'algeria', 'côte', 'cameroon', 'nigeria'];

// Marquer comme suspects (ne pas supprimer immédiatement)
db.users.updateMany(
  {
    $or: [
      { email: { $regex: /@yahoo\.com|@hotmail\.com/i } },
      { 'profile.nom': { $regex: /doctor|money|rich|love|prince/i } },
      { location: { $regex: /benin|algeria|côte|cameroon|nigeria/i } },
    ],
  },
  {
    $set: {
      'flags.suspicious': true,
      'flags.reason': 'Profil suspect détecté automatiquement',
      'flags.flaggedAt': new Date(),
    },
  }
);
