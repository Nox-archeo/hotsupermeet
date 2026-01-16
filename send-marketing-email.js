#!/usr/bin/env node
const mongoose = require('mongoose');
const User = require('./server/models/User');
const { sendMarketingEmail } = require('./server/services/emailService');
require('dotenv').config();

// Script pour envoyer un email marketing aux utilisateurs non-premium
async function sendMarketingToNonPremium() {
  console.log('🚀 === DÉBUT SCRIPT EMAIL MARKETING ===');

  try {
    // Connexion à MongoDB
    console.log('📊 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer tous les utilisateurs non-premium
    console.log('👥 Recherche des utilisateurs non-premium...');
    const nonPremiumUsers = await User.find({
      $or: [
        { 'premium.isPremium': false },
        { 'premium.isPremium': { $exists: false } },
        {
          'premium.isPremium': true,
          'premium.expiration': { $lt: new Date() },
        },
      ],
    }).select('email profile.nom premium');

    console.log(
      `📊 ${nonPremiumUsers.length} utilisateurs non-premium trouvés`
    );

    if (nonPremiumUsers.length === 0) {
      console.log('ℹ️ Aucun utilisateur non-premium trouvé');
      return;
    }

    // Afficher aperçu des utilisateurs
    console.log('\n👥 APERÇU DES UTILISATEURS:');
    nonPremiumUsers.slice(0, 5).forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.email} (${user.profile?.nom || 'Nom inconnu'}) - Premium: ${user.premium?.isPremium || false}`
      );
    });

    if (nonPremiumUsers.length > 5) {
      console.log(`... et ${nonPremiumUsers.length - 5} autres utilisateurs`);
    }

    // Demander confirmation
    console.log(
      "\n⚠️  ATTENTION: Vous êtes sur le point d'envoyer un email marketing à tous ces utilisateurs."
    );
    console.log('📧 Email de: ' + process.env.GMAIL_USER);
    console.log('📝 Sujet: "🔥 On a amélioré votre expérience sur HotMeet !"');

    // Simulation - ne pas envoyer réellement pour le moment
    console.log('\n🔍 MODE SIMULATION - Aucun email ne sera envoyé réellement');
    console.log(
      'Pour envoyer réellement, modifiez la variable SIMULATION dans le script'
    );

    const SIMULATION = true; // Mettre à false pour envoyer réellement

    if (SIMULATION) {
      console.log('\n✅ SIMULATION TERMINÉE');
      console.log(`📊 ${nonPremiumUsers.length} emails auraient été envoyés`);
    } else {
      // Envoi réel des emails (un par un pour éviter les limites)
      let successCount = 0;
      let errorCount = 0;

      console.log('\n📧 Début envoi des emails...');

      for (let i = 0; i < nonPremiumUsers.length; i++) {
        const user = nonPremiumUsers[i];

        try {
          console.log(
            `📧 Envoi ${i + 1}/${nonPremiumUsers.length} à ${user.email}...`
          );

          await sendMarketingEmail(user.email, user.profile?.nom || 'Membre');
          successCount++;

          console.log(`✅ Email envoyé à ${user.email}`);

          // Pause de 2 secondes entre chaque email pour éviter les limites Gmail
          if (i < nonPremiumUsers.length - 1) {
            console.log('⏳ Pause 2 secondes...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur pour ${user.email}:`, error.message);
        }
      }

      console.log('\n📊 === RÉSULTAT FINAL ===');
      console.log(`✅ Emails envoyés avec succès: ${successCount}`);
      console.log(`❌ Erreurs: ${errorCount}`);
      console.log(`📊 Total traité: ${nonPremiumUsers.length}`);
    }
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.connection.close();
    console.log('📊 Connexion MongoDB fermée');
    console.log('🏁 Script terminé');
  }
}

// Exécuter le script
sendMarketingToNonPremium();
