const mongoose = require('mongoose');
const Ad = require('./server/models/Ad');
require('dotenv').config();

// Annonces de test pour remplir la base de données
const testAds = [
  {
    userId: new mongoose.Types.ObjectId(),
    type: 'fantasme',
    title: '🔥 Cherche partenaire pour soirée coquine',
    description:
      'Femme de 28 ans cherche homme discret pour plan sans tabou. Ouverte à toutes propositions excitantes.',
    location: 'Paris, France',
    date: new Date(Date.now() + 48 * 60 * 60 * 1000),
    criteria: {
      ageMin: 25,
      ageMax: 40,
      sexe: 'homme',
      pratiques: ['massage', 'sensuel', 'aventure'],
    },
    premiumOnly: false,
    tags: ['paris', 'soirée', 'discret'],
    status: 'active',
  },
  {
    userId: new mongoose.Types.ObjectId(),
    type: 'soiree',
    title: '💋 Couple libertin reçoit',
    description:
      'Couple expérimenté (30/32 ans) reçoit dans appartement discret. Ambiance détendue et respectueuse.',
    location: 'Lyon, France',
    date: new Date(Date.now() + 72 * 60 * 60 * 1000),
    criteria: {
      ageMin: 22,
      ageMax: 50,
      sexe: 'tous',
      pratiques: ['échange', 'libertinage', 'convivialité'],
    },
    premiumOnly: true,
    tags: ['couple', 'lyon', 'échange'],
    status: 'active',
  },
  {
    userId: new mongoose.Types.ObjectId(),
    type: 'fantasme',
    title: '😈 Dominatrice cherche soumis',
    description:
      'Maîtresse expérimentée initie débutant aux plaisirs de la soumission. Respect et limites garanties.',
    location: 'Marseille, France',
    date: new Date(Date.now() + 96 * 60 * 60 * 1000),
    criteria: {
      ageMin: 20,
      ageMax: 45,
      sexe: 'homme',
      pratiques: ['domination', 'bdsm', 'initiation'],
    },
    premiumOnly: true,
    tags: ['marseille', 'domination', 'initiation'],
    status: 'active',
  },
  {
    userId: new mongoose.Types.ObjectId(),
    type: 'service',
    title: '🌹 Massage tantrique authentique',
    description:
      'Homme qualifié propose massages tantriques dans environnement zen et respectueux.',
    location: 'Nice, France',
    date: new Date(Date.now() + 120 * 60 * 60 * 1000),
    criteria: {
      ageMin: 18,
      ageMax: 60,
      sexe: 'femme',
      pratiques: ['massage', 'tantrique', 'relaxation'],
    },
    premiumOnly: false,
    tags: ['nice', 'massage', 'tantrique'],
    status: 'active',
  },
  {
    userId: new mongoose.Types.ObjectId(),
    type: 'fantasme',
    title: '🎭 Jeux de rôles créatifs',
    description:
      'Personne créative propose scénarios originaux et jeux de rôles sur mesure. Imagination sans limite !',
    location: 'Bordeaux, France',
    date: new Date(Date.now() + 144 * 60 * 60 * 1000),
    criteria: {
      ageMin: 21,
      ageMax: 50,
      sexe: 'tous',
      pratiques: ['roleplay', 'créatif', 'scénarios'],
    },
    premiumOnly: false,
    tags: ['bordeaux', 'roleplay', 'créatif'],
    status: 'active',
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Supprimer les anciennes annonces de test
    console.log('🗑️ Suppression des anciennes annonces...');
    await Ad.deleteMany({});

    // Insérer les nouvelles annonces
    console.log('📝 Création des nouvelles annonces...');
    const createdAds = await Ad.insertMany(testAds);

    console.log(`✅ ${createdAds.length} annonces créées avec succès !`);
    console.log('🔥 La page annonces va maintenant afficher du contenu !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔐 Connexion fermée');
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  seedDatabase();
}

module.exports = { testAds, seedDatabase };
