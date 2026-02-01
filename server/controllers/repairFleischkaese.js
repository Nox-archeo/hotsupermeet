const User = require('../models/User');

// Endpoint spécial pour réparer fleischkaese69@gmail.com
const repairFleischkaese = async (req, res) => {
  try {
    console.log('🚨 RÉPARATION - fleischkaese69@gmail.com');

    const userEmail = 'fleischkaese69@gmail.com';
    const userId = '695556ce4f28a87788b15aaf';

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'fleischkaese69@gmail.com non trouvé',
      });
    }

    console.log('📋 État AVANT réparation:');
    console.log(`   Premium: ${user.premium.isPremium}`);
    console.log(`   Expiration: ${user.premium.expiration}`);
    console.log(`   PayPal Sub ID: ${user.premium.paypalSubscriptionId}`);

    // Il a payé le 31 janvier 2026 à 10:19 -> expire le 1er mars 2026
    const nouvelleDateExpiration = new Date('2026-03-01T10:19:00.000Z');

    user.premium.isPremium = true;
    user.premium.expiration = nouvelleDateExpiration;
    // Mettre à jour avec le bon ID PayPal du webhook
    user.premium.paypalSubscriptionId = 'I-RKG6UWGPNUY3';

    await user.save();

    console.log('✅ FLEISCHKAESE RÉPARÉ !');

    res.json({
      success: true,
      message: 'fleischkaese69@gmail.com réparé avec succès',
      user: {
        id: user._id,
        email: user.email,
        premium: {
          isPremium: user.premium.isPremium,
          expiration: user.premium.expiration,
          paypalSubscriptionId: user.premium.paypalSubscriptionId,
        },
      },
    });
  } catch (error) {
    console.error('Erreur réparation fleischkaese:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  repairFleischkaese,
};
