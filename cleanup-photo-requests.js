const mongoose = require('mongoose');

async function cleanupPhotoRequests() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(
      'mongodb+srv://sebchappss_db_user:Lilith66.666.7@cluster0.se1vr8.mongodb.net/hotsupermeet'
    );
    console.log('✅ Connecté à MongoDB');

    console.log('🔍 Recherche des demandes de photos privées...');

    // Trouver toutes les demandes
    const collection = mongoose.connection.db.collection(
      'privatephotorequests'
    );
    const requests = await collection.find({}).toArray();

    console.log('📊 Nombre de demandes trouvées:', requests.length);

    if (requests.length > 0) {
      console.log('📋 Demandes trouvées:');
      requests.forEach((req, index) => {
        console.log(
          `  ${index + 1}. ID: ${req._id}, De: ${req.requester}, Vers: ${req.target}, Status: ${req.status}`
        );
      });

      console.log('🗑️ Suppression des demandes...');
      const deleteResult = await collection.deleteMany({});
      console.log(
        `✅ ${deleteResult.deletedCount} demandes supprimées avec succès!`
      );
    } else {
      console.log('ℹ️ Aucune demande trouvée à supprimer');
    }

    await mongoose.disconnect();
    console.log('👋 Déconnecté de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanupPhotoRequests();
