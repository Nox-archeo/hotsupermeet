const mongoose = require('mongoose');
const User = require('./server/models/User');
const Message = require('./server/models/Message');

// Configuration de connexion MongoDB
mongoose.connect(
  process.env.MONGODB_URI ||
    'mongodb+srv://margaux:Password2024@cluster0.5dlhl.mongodb.net/hotsupermeet?retryWrites=true&w=majority'
);

async function debugLucieMessages() {
  try {
    console.log('🔍 Recherche du profil Lucie...');

    // Trouver Lucie
    const lucie = await User.findOne({
      'profile.nom': { $regex: /lucie/i },
    });

    if (!lucie) {
      console.log('❌ Profil Lucie non trouvé');
      return;
    }

    console.log('✅ Profil Lucie trouvé:', {
      id: lucie._id,
      nom: lucie.profile?.nom,
      email: lucie.email,
      isBlocked: lucie.security?.isBlocked,
    });

    // Vérifier tous les messages pour Lucie
    console.log('\n🔍 Messages REÇUS par Lucie...');
    const messagesRecus = await Message.find({
      toUserId: lucie._id,
    })
      .populate('fromUserId', 'profile.nom')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(
      `📨 ${messagesRecus.length} messages reçus:`,
      messagesRecus.map(m => ({
        id: m._id,
        from: m.fromUserId ? m.fromUserId.profile?.nom : 'UTILISATEUR SUPPRIME',
        content: m.content?.substring(0, 50),
        status: m.status,
        isInitialRequest: m.isInitialRequest,
        date: m.createdAt,
      }))
    );

    // Vérifier les demandes en attente spécifiquement
    console.log('\n🔍 Demandes EN ATTENTE pour Lucie...');
    const demandesEnAttente = await Message.find({
      toUserId: lucie._id,
      isInitialRequest: true,
      status: 'pending',
    }).populate('fromUserId', 'profile.nom profile.photos');

    console.log(
      `📨 ${demandesEnAttente.length} demandes en attente:`,
      demandesEnAttente.map(m => ({
        id: m._id,
        fromUser: m.fromUserId,
        content: m.content?.substring(0, 50),
        status: m.status,
        isInitialRequest: m.isInitialRequest,
      }))
    );

    // Chercher les messages avec fromUserId null ou invalide
    console.log('\n🔍 Messages avec fromUserId problématique...');
    const messagesProblematiques = await Message.find({
      toUserId: lucie._id,
      fromUserId: { $exists: false },
    });

    if (messagesProblematiques.length > 0) {
      console.log(
        '❌ Messages avec fromUserId manquant:',
        messagesProblematiques.length
      );
    }

    // Test de l'erreur populate
    console.log('\n🔍 Test populate fromUserId...');
    try {
      const testPopulate = await Message.findOne({
        toUserId: lucie._id,
      }).populate('fromUserId', 'profile.nom profile.photos');

      console.log('✅ Populate test réussi');
      if (testPopulate && !testPopulate.fromUserId) {
        console.log(
          '⚠️ fromUserId null après populate - utilisateur supprimé!'
        );
      }
    } catch (populateError) {
      console.log('❌ Erreur populate:', populateError.message);
    }
  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugLucieMessages();
