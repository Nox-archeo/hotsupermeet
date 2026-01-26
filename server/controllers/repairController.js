const express = require('express');
const User = require('../models/User');
const PayPalService = require('../services/paypalService');

// Endpoint spécial pour réparer Steve Rossier et tester le système
const repairSteveRossier = async (req, res) => {
  try {
    console.log('🚨 RÉPARATION URGENTE - Steve Rossier');

    // Chercher Steve par email ET par ID
    const userEmail = 'steverosse@hotmail.com';
    const userId = '694e8009083b928a13385fff';

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur Steve Rossier non trouvé',
      });
    }

    console.log('📋 État AVANT réparation:');
    console.log(`   Premium: ${user.premium.isPremium}`);
    console.log(`   Expiration: ${user.premium.expiration}`);
    console.log(`   PayPal Sub ID: ${user.premium.paypalSubscriptionId}`);

    // Steve a payé le 26 janvier 2026 à 03:06 -> prolonger jusqu'au 26 février 2026
    const nouvelleDateExpiration = new Date('2026-02-26T03:06:00.000Z');

    user.premium.isPremium = true;
    user.premium.expiration = nouvelleDateExpiration;
    user.premium.paypalSubscriptionId = 'I-UT41KX29XFX6';

    await user.save();

    console.log('✅ STEVE ROSSIER RÉPARÉ !');

    res.json({
      success: true,
      message: 'Steve Rossier réparé avec succès',
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
    console.error('❌ ERREUR RÉPARATION STEVE:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Endpoint pour tester le processus des webhooks PAYMENT.SALE.COMPLETED
const testPaymentSaleCompleted = async (req, res) => {
  try {
    console.log('🧪 TEST handlePaymentSaleCompleted');

    // Simuler le resource du vrai webhook PayPal de Steve
    const fakeResource = {
      id: '0FS61708PS076762Y',
      billing_agreement_id: 'I-UT41KX29XFX6',
      custom_id: '694e8009083b928a13385fff',
      amount: {
        total: '5.75',
        currency: 'CHF',
      },
      state: 'completed',
      create_time: '2026-01-26T11:06:02Z',
    };

    // Appeler directement la méthode PayPalService
    const result = await PayPalService.handlePaymentSaleCompleted(fakeResource);

    res.json({
      success: true,
      message: 'Test PAYMENT.SALE.COMPLETED terminé',
      result: result,
    });
  } catch (error) {
    console.error('❌ ERREUR TEST:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = { repairSteveRossier, testPaymentSaleCompleted };
