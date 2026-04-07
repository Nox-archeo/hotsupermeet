const User = require('../models/User');
const PayPalService = require('../services/paypalService');

// 🔍 Réconciliation intelligente PayPal ↔ Utilisateurs
const reconcilePayPalUsers = async (req, res) => {
  try {
    console.log('🔄 RÉCONCILIATION PAYPAL DÉMARRÉE...');

    // Liste des abonnements PayPal ACTIFS pour HotMeet
    const activeSubscriptions = [
      'I-05NA2XGP42A2', // cuvelier535@gmail.com
      'I-3V1R3GKLF1UD', // louloup2626@gmail.com
      'I-WSH5UR2FFDD5', // arthurbovier@gmail.com
      'I-RGCAT154R54F', // sebastien.brea+shopify@gmail.com
      'I-RS91L0AMH8KN', // andre_raphael1997@hotmail.com
      'I-KJ0TX8R3GMYV', // angelique.florczyk@gmail.com
    ];

    const results = {
      summary: {
        checked: 0,
        found: 0,
        notFound: 0,
        deleted: 0,
        repaired: 0,
      },
      details: [],
      recommendations: [],
    };

    for (const subscriptionId of activeSubscriptions) {
      try {
        console.log(`\n🔍 Traitement abonnement: ${subscriptionId}`);

        // 1. Récupérer les détails PayPal
        const paypalData =
          await PayPalService.getSubscriptionDetails(subscriptionId);
        const paypalEmail = paypalData.subscriber.email_address;
        const customId = paypalData.custom_id;

        console.log(`📧 Email PayPal: ${paypalEmail}`);
        console.log(`🆔 Custom ID: ${customId}`);

        results.summary.checked++;

        // 2. Chercher l'utilisateur par EMAIL PAYPAL (prioritaire)
        let user = await User.findOne({ email: paypalEmail });

        // 3. Si pas trouvé par email PayPal, essayer par custom_id
        if (!user && customId) {
          try {
            user = await User.findById(customId);
            if (user) {
              console.log(`✅ Trouvé par custom_id: ${user.email}`);
            }
          } catch (err) {
            console.log(`❌ Custom ID invalide: ${customId}`);
          }
        }

        let status = 'NOT_FOUND';
        let action = 'AUCUNE';
        let issue = null;

        if (user) {
          results.summary.found++;

          // Vérifier si l'utilisateur a supprimé son compte
          if (user.deleted || user.isDeleted) {
            status = 'DELETED_ACCOUNT';
            action = 'ANNULER_ABONNEMENT';
            issue =
              'Utilisateur a supprimé son compte - Arrêter les prélèvements';
            results.summary.deleted++;
          } else {
            // Utilisateur existe et actif
            if (user.premium.paypalSubscriptionId !== subscriptionId) {
              status = 'NEEDS_REPAIR';
              action = 'RÉPARER_LIEN';
              issue = `PayPal ID incorrect: ${user.premium.paypalSubscriptionId} → ${subscriptionId}`;
            } else if (!user.premium.isPremium) {
              status = 'NEEDS_ACTIVATION';
              action = 'ACTIVER_PREMIUM';
              issue = 'Abonnement PayPal actif mais premium désactivé';
            } else {
              status = 'OK';
              action = 'AUCUNE';
            }
          }
        } else {
          results.summary.notFound++;
          status = 'USER_NOT_EXISTS';
          action = 'CRÉER_OU_ANNULER';
          issue =
            'Utilisateur introuvable - Soit il a supprimé son compte, soit erreur de liaison';
        }

        const detail = {
          subscriptionId,
          paypalEmail,
          customId,
          localUser: user
            ? {
                id: user._id,
                email: user.email,
                isPremium: user.premium.isPremium,
                paypalId: user.premium.paypalSubscriptionId,
                deleted: user.deleted || user.isDeleted || false,
              }
            : null,
          paypalStatus: paypalData.status,
          outstandingBalance: paypalData.billing_info.outstanding_balance.value,
          failedPayments: paypalData.billing_info.failed_payments_count,
          lastPayment: paypalData.billing_info.last_payment,
          nextBilling: paypalData.billing_info.next_billing_time,
          status,
          action,
          issue,
        };

        results.details.push(detail);
      } catch (error) {
        console.error(`❌ Erreur traitement ${subscriptionId}:`, error.message);
        results.details.push({
          subscriptionId,
          error: error.message,
          status: 'ERROR',
          action: 'VÉRIFIER_MANUELLEMENT',
        });
      }
    }

    // Générer les recommandations
    const needsRepair = results.details.filter(
      d => d.action === 'RÉPARER_LIEN'
    );
    const needsActivation = results.details.filter(
      d => d.action === 'ACTIVER_PREMIUM'
    );
    const needsCancellation = results.details.filter(
      d => d.action === 'ANNULER_ABONNEMENT'
    );
    const unknownUsers = results.details.filter(
      d => d.action === 'CRÉER_OU_ANNULER'
    );

    if (needsRepair.length > 0) {
      results.recommendations.push(
        `🔧 Réparer ${needsRepair.length} liaisons PayPal`
      );
    }

    if (needsActivation.length > 0) {
      results.recommendations.push(
        `✅ Activer premium pour ${needsActivation.length} utilisateurs`
      );
    }

    if (needsCancellation.length > 0) {
      results.recommendations.push(
        `❌ URGENT: Annuler ${needsCancellation.length} abonnements (comptes supprimés)`
      );
    }

    if (unknownUsers.length > 0) {
      results.recommendations.push(
        `❓ Enquêter sur ${unknownUsers.length} utilisateurs introuvables`
      );
    }

    console.log(`\n✅ RÉCONCILIATION TERMINÉE`);
    console.log(
      `📊 ${results.summary.found}/${results.summary.checked} utilisateurs trouvés`
    );

    res.json({
      timestamp: new Date().toISOString(),
      results,
      instructions: {
        repair:
          'Utiliser /api/admin/repair-paypal-links pour réparer automatiquement',
        cancel:
          "Utiliser /api/admin/cancel-deleted-subscriptions pour annuler les abonnements d'utilisateurs supprimés",
      },
    });
  } catch (error) {
    console.error('❌ Erreur réconciliation:', error);
    res.status(500).json({
      error: 'Erreur réconciliation PayPal',
      message: error.message,
    });
  }
};

// 🔧 Réparer automatiquement les liens PayPal
const repairPayPalLinks = async (req, res) => {
  try {
    const repairs = [];
    const activeSubscriptions = [
      'I-05NA2XGP42A2',
      'I-3V1R3GKLF1UD',
      'I-WSH5UR2FFDD5',
      'I-RGCAT154R54F',
      'I-RS91L0AMH8KN',
      'I-KJ0TX8R3GMYV',
    ];

    for (const subscriptionId of activeSubscriptions) {
      try {
        const paypalData =
          await PayPalService.getSubscriptionDetails(subscriptionId);
        const paypalEmail = paypalData.subscriber.email_address;

        // Chercher utilisateur par email PayPal
        const user = await User.findOne({ email: paypalEmail });

        if (user && !user.deleted && !user.isDeleted) {
          // Calculer nouvelle expiration
          const newExpiration = new Date();
          newExpiration.setMonth(newExpiration.getMonth() + 1);

          // Mettre à jour
          user.premium.isPremium = true;
          user.premium.paypalSubscriptionId = subscriptionId;
          user.premium.expiration = newExpiration;

          await user.save();

          repairs.push({
            subscriptionId,
            userEmail: user.email,
            paypalEmail,
            newExpiration,
            status: 'REPAIRED',
          });
        }
      } catch (error) {
        repairs.push({
          subscriptionId,
          error: error.message,
          status: 'FAILED',
        });
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      repairs,
      summary: {
        successful: repairs.filter(r => r.status === 'REPAIRED').length,
        failed: repairs.filter(r => r.status === 'FAILED').length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erreur réparation',
      message: error.message,
    });
  }
};

module.exports = {
  reconcilePayPalUsers,
  repairPayPalLinks,
};
