const mongoose = require('mongoose');

// Modèles
const User = require('./server/models/User');
const Message = require('./server/models/Message');

// MongoDB URI (celle de production Render)
const MONGODB_URI =
  'mongodb+srv://margauxchampod:qRz8oGXo7VGJhv0m@cluster0.rdp20.mongodb.net/hotsupermeet?retryWrites=true&w=majority&appName=Cluster0';

async function cleanupConversations() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouve les utilisateurs de test
    const camille = await User.findOne({ pseudo: 'camille' });
    const gog = await User.findOne({ pseudo: 'gog' });

    if (!camille || !gog) {
      console.log('❌ Utilisateurs de test non trouvés');
      console.log('Camille:', camille ? '✅' : '❌');
      console.log('Gog:', gog ? '✅' : '❌');
      return;
    }

    console.log('👤 Camille ID:', camille._id);
    console.log('👤 Gog ID:', gog._id);

    // Supprime toutes les conversations entre ces utilisateurs
    const deletedMessages = await Message.deleteMany({
      $or: [
        { sender: camille._id, recipient: gog._id },
        { sender: gog._id, recipient: camille._id },
      ],
    });

    console.log(
      `🗑️ ${deletedMessages.deletedCount} messages supprimés entre Camille et Gog`
    );
    console.log('✅ Nettoyage terminé - Vous pouvez maintenant retester');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

cleanupConversations();
