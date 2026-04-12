const User = require('../models/User');
const PayPalService = require('../services/paypalService');

// 🧹 Nettoyer les IDs PayPal obsolètes pour arrêter les erreurs 404
const cleanObsoletePayPalIds = async (req, res) => {
  try {
    console.log('🧹 NETTOYAGE IDS PAYPAL OBSOLÈTES DÉMARRÉ...');

    const results = {
      checked: 0,
      cleaned: 0,
      errors: 0,
      details: [],
    };

    // Récupérer tous les utilisateurs avec un PayPal ID
    const usersWithPayPal = await User.find({
      'premium.paypalSubscriptionId': { $exists: true, $ne: null },
    }).select('_id email premium');

    console.log(
      `🔍 ${usersWithPayPal.length} utilisateurs avec PayPal ID trouvés`
    );

    for (const user of usersWithPayPal) {
      const paypalId = user.premium.paypalSubscriptionId;
      results.checked++;

      try {
        // Tenter de récupérer l'abonnement PayPal
        await PayPalService.getSubscriptionDetails(paypalId);

        // Si ça marche, l'ID est valide
        results.details.push({
          userId: user._id,
          email: user.email,
          paypalId,
          status: 'VALID',
        });
      } catch (error) {
        // Si erreur 404 ou "non trouvé", nettoyer l'ID
        if (
          error.message.includes('non trouvé') ||
          error.message.includes('404') ||
          error.message.includes('INVALID_RESOURCE_ID')
        ) {
          console.log(
            `🗑️ Nettoyage ID obsolète ${paypalId} pour ${user.email}`
          );

          // Supprimer l'ID PayPal obsolète
          user.premium.paypalSubscriptionId = null;
          await user.save();

          results.cleaned++;
          results.details.push({
            userId: user._id,
            email: user.email,
            paypalId,
            status: 'CLEANED_404',
          });
        } else {
          // Autre type d'erreur
          results.errors++;
          results.details.push({
            userId: user._id,
            email: user.email,
            paypalId,
            status: 'ERROR',
            error: error.message,
          });
        }
      }
    }

    console.log(
      `✅ NETTOYAGE TERMINÉ: ${results.cleaned} IDs nettoyés, ${results.errors} erreurs`
    );

    res.json({
      timestamp: new Date().toISOString(),
      summary: {
        checked: results.checked,
        cleaned: results.cleaned,
        errors: results.errors,
        validIds: results.checked - results.cleaned - results.errors,
      },
      details: results.details,
      message: `${results.cleaned} IDs PayPal obsolètes supprimés. Plus de 404 !`,
    });
  } catch (error) {
    console.error('❌ Erreur nettoyage PayPal IDs:', error);
    res.status(500).json({
      error: 'Erreur nettoyage',
      message: error.message,
    });
  }
};

module.exports = {
  cleanObsoletePayPalIds,
};
