const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

const fixExpiredUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const userId = '694c07a87e92345006d59dd3';
    const user = await User.findById(userId);

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    console.log('📋 État actuel:');
    console.log(`- Email: ${user.email}`);
    console.log(`- isPremium: ${user.premium.isPremium}`);
    console.log(`- expiration: ${user.premium.expiration}`);
    console.log(`- paypalSubscriptionId: ${user.premium.paypalSubscriptionId}`);
    console.log(`- Est expiré?: ${user.premium.expiration < new Date()}`);

    if (user.premium.expiration && user.premium.expiration < new Date()) {
      console.log("🔄 Correction de l'abonnement expiré...");

      user.premium.isPremium = false;
      // On garde l'expiration et l'ID PayPal pour l'historique
      await user.save();

      console.log('✅ Utilisateur mis à jour - Premium désactivé');
    } else {
      console.log("ℹ️ Cet abonnement n'est pas encore expiré");
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
};

fixExpiredUser();
