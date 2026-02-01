const axios = require('axios');

// Réparer fleischkaese69@gmail.com qui a payé mais n'a pas été renouvelé
async function repairerFleischkaese() {
  try {
    console.log('🚨 RÉPARATION URGENTE - fleischkaese69@gmail.com');
    console.log('ID: 695556ce4f28a87788b15aaf');
    console.log('PayPal Subscription: I-BARC0MUYEM9C');
    console.log('Paiement effectué: 31 janvier 2026 à 02:19');

    // Simuler le webhook PAYMENT.SALE.COMPLETED qui n'a pas fonctionné
    const webhookPayload = {
      event_type: 'PAYMENT.SALE.COMPLETED',
      resource: {
        id: '9VY92914RS9326022', // Le vrai ID du paiement
        billing_agreement_id: 'I-RKG6UWGPNUY3', // L'ID qui était dans le webhook
        custom: '695556ce4f28a87788b15aaf', // L'ID MongoDB de l'utilisateur
        amount: {
          total: '5.75',
          currency: 'CHF',
        },
        state: 'completed',
        create_time: '2026-01-31T10:19:02Z',
      },
    };

    console.log('📡 Test du système corrigé avec le vrai webhook...');

    const response = await axios.post(
      'https://www.hotsupermeet.com/api/test-payment-sale-completed',
      {
        test_data: webhookPayload,
        force_process: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RepairFleischkaese/1.0',
        },
      }
    );

    console.log('✅ Réponse:', response.data);

    if (
      response.data &&
      response.data.result &&
      response.data.result.processed
    ) {
      console.log(
        '🎉 SUCCÈS ! fleischkaese69@gmail.com devrait maintenant avoir son premium renouvelé'
      );
      console.log(
        '📅 Son premium devrait expirer le 1er mars 2026 (31 jan + 1 jour + 1 mois)'
      );
    } else {
      console.log("❌ Le système n'a pas pu traiter le paiement");
    }
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

repairerFleischkaese();
