// CORRECTION URGENTE PREMIUM - USER ID: 694c07a87e92345006d59dd3
const mongoose = require('mongoose');

// Schema utilisateur simplifié
const userSchema = new mongoose.Schema({
  email: String,
  profile: { nom: String },
  premium: {
    isPremium: Boolean,
    expiration: Date,
    paypalSubscriptionId: String,
  },
});

const User = mongoose.model('User', userSchema);

async function fixUserPremium() {
  try {
    // Connexion MongoDB avec l'URI de production
    const mongoUri =
      'mongodb+srv://margauxthomas999:Margaux8123@cluster0.kxzfw.mongodb.net/hotsupermeet?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Utilisateur spécifique avec le problème
    const userId = '694c07a87e92345006d59dd3';

    const user = await User.findById(userId);

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    console.log(`👤 UTILISATEUR: ${user.email}`);
    console.log(`📅 Expiration ACTUELLE: ${user.premium.expiration}`);
    console.log(`💳 PayPal ID: ${user.premium.paypalSubscriptionId}`);

    // CORRECTION: Prolonger de 1 mois depuis le dernier paiement (24 janvier 2026)
    const dateLastPayment = new Date('2026-01-24'); // Date du paiement
    const newExpiration = new Date(dateLastPayment);
    newExpiration.setMonth(newExpiration.getMonth() + 1); // +1 mois

    console.log(`🔧 NOUVELLE expiration calculée: ${newExpiration}`);

    // Mettre à jour
    user.premium.isPremium = true;
    user.premium.expiration = newExpiration;

    await user.save();

    console.log(`✅ PREMIUM CORRIGÉ !`);
    console.log(`💎 Nouveau statut:`);
    console.log(`   - isPremium: ${user.premium.isPremium}`);
    console.log(`   - expiration: ${user.premium.expiration}`);
    console.log(
      `🎉 L'utilisateur peut maintenant utiliser toutes les fonctionnalités premium !`
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Route Express pour correction via API
function createFixRoute(app) {
  app.post('/api/fix-premium-emergency', async (req, res) => {
    try {
      const userId = '694c07a87e92345006d59dd3';
      const User = require('./server/models/User');

      const user = await User.findById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: 'Utilisateur non trouvé' });
      }

      // Calculer nouvelle expiration depuis le dernier paiement
      const dateLastPayment = new Date('2026-01-24');
      const newExpiration = new Date(dateLastPayment);
      newExpiration.setMonth(newExpiration.getMonth() + 1);

      const oldExpiration = user.premium.expiration;

      user.premium.isPremium = true;
      user.premium.expiration = newExpiration;

      await user.save();

      console.log(
        `🚨 CORRECTION URGENTE APPLIQUÉE pour ${user.profile.nom || user.email}`
      );

      res.json({
        success: true,
        message: 'Premium corrigé avec succès',
        user: {
          id: userId,
          email: user.email,
          oldExpiration,
          newExpiration,
          isNowPremium: user.premium.isPremium,
        },
      });
    } catch (error) {
      console.error('❌ Erreur correction:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

if (require.main === module) {
  fixUserPremium();
} else {
  module.exports = { createFixRoute };
}
