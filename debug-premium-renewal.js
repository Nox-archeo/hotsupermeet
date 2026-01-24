require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');
const PayPalService = require('./server/services/paypalService');

async function debugPremiumRenewal() {
  try {
    // Utiliser l'URI MongoDB depuis le serveur s'il n'y a pas de .env
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb+srv://margauxthomas999:Margaux8123@cluster0.kxzfw.mongodb.net/hotsupermeet?retryWrites=true&w=majority&appName=Cluster0';

    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // ID de subscription PayPal fourni par l'utilisateur
    const paypalSubscriptionId = 'I-BSL7YBKH199J';

    console.log(
      `🔍 Recherche utilisateur avec subscription: ${paypalSubscriptionId}`
    );

    // Trouver l'utilisateur avec cet ID PayPal
    const user = await User.findOne({
      'premium.paypalSubscriptionId': paypalSubscriptionId,
    });

    if (!user) {
      console.log('❌ UTILISATEUR NON TROUVÉ avec cet ID PayPal');

      // Chercher tous les utilisateurs premium pour debug
      const premiumUsers = await User.find({
        'premium.paypalSubscriptionId': { $exists: true, $ne: null },
      }).select('_id profile.nom premium');

      console.log('\n📋 UTILISATEURS PREMIUM TROUVÉS:');
      premiumUsers.forEach(u => {
        console.log(
          `- ${u._id}: ${u.profile.nom} - PayPal ID: ${u.premium.paypalSubscriptionId}`
        );
        console.log(
          `  Premium: ${u.premium.isPremium}, Exp: ${u.premium.expiration}`
        );
      });

      return;
    }

    console.log(`\n👤 UTILISATEUR TROUVÉ: ${user.profile.nom} (${user._id})`);
    console.log(`💎 Status Premium Actuel:`);
    console.log(`   isPremium: ${user.premium.isPremium}`);
    console.log(`   expiration: ${user.premium.expiration}`);
    console.log(
      `   paypalSubscriptionId: ${user.premium.paypalSubscriptionId}`
    );

    // Vérifier le statut PayPal
    try {
      const paypalDetails =
        await PayPalService.getSubscriptionDetails(paypalSubscriptionId);
      console.log(`\n💳 STATUT PAYPAL:`);
      console.log(`   Status: ${paypalDetails.status}`);
      console.log(`   Plan ID: ${paypalDetails.plan_id}`);
      console.log(`   Create Time: ${paypalDetails.create_time}`);
      console.log(
        `   Next Billing: ${paypalDetails.billing_info?.next_billing_time || 'N/A'}`
      );
    } catch (error) {
      console.log(`❌ Erreur PayPal: ${error.message}`);
    }

    // Simuler le traitement du paiement réussi (comme si le webhook était arrivé)
    console.log(`\n🔧 SIMULATION DU WEBHOOK PAYMENT.SUCCEEDED...`);

    const mockResource = {
      billing_agreement_id: paypalSubscriptionId,
      id: paypalSubscriptionId,
    };

    const result = await PayPalService.handlePaymentSucceeded(mockResource);

    if (result.processed) {
      console.log(`✅ PREMIUM RENOUVELÉ AVEC SUCCÈS !`);

      // Vérifier le nouveau statut
      await user.reload();
      console.log(`\n💎 NOUVEAU STATUS PREMIUM:`);
      console.log(`   isPremium: ${user.premium.isPremium}`);
      console.log(`   expiration: ${user.premium.expiration}`);
    } else {
      console.log(`❌ Erreur renouvellement: ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Fonction pour vérifier tous les utilisateurs avec des expirations récentes
async function checkRecentExpirations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const users = await User.find({
      'premium.expiration': {
        $gte: yesterday,
        $lte: new Date(),
      },
    }).select('_id profile.nom premium');

    console.log(`\n📅 UTILISATEURS AVEC EXPIRATION RÉCENTE:`);
    users.forEach(user => {
      console.log(
        `- ${user.profile.nom}: ${user.premium.expiration} (Premium: ${user.premium.isPremium})`
      );
      console.log(
        `  PayPal ID: ${user.premium.paypalSubscriptionId || 'AUCUN'}`
      );
    });
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const action = process.argv[2];

  if (action === 'check') {
    checkRecentExpirations();
  } else {
    debugPremiumRenewal();
  }
}
