const mongoose = require('mongoose');
const User = require('./server/models/User');

async function debugNoxRecherche() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 Connexion MongoDB réussie');

    // Chercher Nox
    const nox = await User.findOne({ 'profile.nom': 'Nox' });

    if (!nox) {
      console.log('❌ Utilisateur Nox non trouvé');
      return;
    }

    console.log('✅ Utilisateur Nox trouvé:');
    console.log('ID:', nox._id);
    console.log('Nom:', nox.profile.nom);
    console.log('Email:', nox.email);
    console.log('Recherche actuelle:', nox.profile.recherche);
    console.log('Profile complet:', JSON.stringify(nox.profile, null, 2));

    // Test API simulation
    console.log('\n🧪 TEST API getUsers (simulation):');
    const users = await User.find({ 'security.isBlocked': false })
      .select(
        'profile.nom profile.age profile.sexe profile.orientation profile.localisation profile.photos profile.disponibilite profile.recherche stats.lastActive premium.isPremium'
      )
      .limit(5)
      .lean();

    users.forEach(user => {
      console.log(
        `- ${user.profile.nom}: recherche = ${JSON.stringify(user.profile.recherche)}`
      );
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Connexion fermée');
  }
}

// Lancer le debug
require('dotenv').config();
debugNoxRecherche();
