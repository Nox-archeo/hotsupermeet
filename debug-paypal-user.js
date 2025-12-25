const mongoose = require('mongoose');
require('dotenv').config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Modèle User (simplifié)
const userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    premium: {
      paypalSubscriptionId: String,
      isActive: Boolean,
      expiresAt: Date,
    },
    personalInfo: {
      firstName: String,
      lastName: String,
    },
  },
  { collection: 'users' }
);

const User = mongoose.model('User', userSchema);

async function findUserBySubscriptionId() {
  try {
    const subscriptionId = 'I-VY5N67FMNW0S';

    console.log(
      `🔍 Recherche utilisateur avec subscription ID: ${subscriptionId}`
    );

    const user = await User.findOne({
      'premium.paypalSubscriptionId': subscriptionId,
    }).select('username email personalInfo premium');

    if (user) {
      console.log('\n✅ UTILISATEUR TROUVÉ:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 Username: ${user.username}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(
        `🎭 Nom: ${user.personalInfo?.firstName || 'N/A'} ${user.personalInfo?.lastName || 'N/A'}`
      );
      console.log(
        `💎 Premium actif: ${user.premium?.isActive ? 'OUI' : 'NON'}`
      );
      console.log(`⏰ Expire le: ${user.premium?.expiresAt || 'N/A'}`);
      console.log(`🔗 PayPal ID: ${user.premium?.paypalSubscriptionId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('❌ AUCUN utilisateur trouvé avec cet abonnement PayPal');
      console.log(
        '🔍 Recherche dans tous les utilisateurs avec un abonnement...'
      );

      const allPremiumUsers = await User.find({
        'premium.paypalSubscriptionId': { $exists: true, $ne: null },
      }).select('username email premium.paypalSubscriptionId');

      console.log(
        `\n📊 ${allPremiumUsers.length} utilisateurs avec abonnement PayPal trouvés:`
      );
      allPremiumUsers.forEach((u, i) => {
        console.log(
          `${i + 1}. ${u.username} (${u.email}) → ${u.premium.paypalSubscriptionId}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

findUserBySubscriptionId();
