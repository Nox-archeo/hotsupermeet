const nodemailer = require('nodemailer');

// Configuration du transporteur Gmail
const createTransporter = () => {
  console.log('🔧 === DÉBUT CONFIGURATION TRANSPORTEUR GMAIL ===');
  console.log(
    'GMAIL_USER:',
    process.env.GMAIL_USER ? process.env.GMAIL_USER : 'Non défini'
  );
  console.log(
    'GMAIL_PASSWORD:',
    process.env.GMAIL_PASSWORD
      ? '***' + process.env.GMAIL_PASSWORD.slice(-4)
      : 'Non défini'
  );

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
    console.error('❌ Variables d\\' + 'environnement Gmail manquantes');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    console.log('✅ Transporteur Gmail créé avec succès');
    return transporter;
  } catch (error) {
    console.error('❌ Erreur lors de la création du transporteur:', error);
    return null;
  }
};

// Email de réinitialisation de mot de passe
const sendPasswordResetEmail = async (email, resetToken) => {
  console.log('📧 === DÉBUT ENVOI EMAIL RESET PASSWORD ===');
  console.log('📧 Destinataire:', email);
  console.log(
    '📧 Token (premiers caractères):',
    resetToken.substring(0, 10) + '...'
  );

  try {
    const transporter = createTransporter();

    if (!transporter) {
      throw new Error('Impossible de créer le transporteur email');
    }

    const resetUrl = `https://www.hotsupermeet.com/reset-password?token=${resetToken}`;
    console.log('📧 URL de reset:', resetUrl);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - HotMeet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8a2be2; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .button { 
              display: inline-block; 
              background: #8a2be2; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              color: #666; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HotMeet</h1>
              <p>Rencontres Adultes Premium</p>
            </div>
            <div class="content">
              <h2>Réinitialisation de votre mot de passe</h2>
              <p>Bonjour,</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe HotMeet.</p>
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              
              <p>Ce lien expirera dans 1 heure.</p>
              <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 HotMeet. Tous droits réservés.</p>
              <p>Support: hotsupermeet@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log("📧 Tentative d'envoi...");
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log('📧 Résultat:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected,
    });
    console.log('📧 === FIN ENVOI EMAIL SUCCESS ===');

    return result;
  } catch (error) {
    console.error('❌ === ERREUR ENVOI EMAIL ===');
    console.error("❌ Type d'erreur:", error.name);
    console.error('❌ Message:', error.message);
    console.error('❌ Code:', error.code);
    console.error('❌ Stack:', error.stack);
    console.error('❌ === FIN ERREUR EMAIL ===');
    throw error;
  }
};

// Email de confirmation de réinitialisation
const sendPasswordResetConfirmation = async email => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Mot de passe modifié - HotMeet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8a2be2; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              color: #666; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HotMeet</h1>
              <p>Rencontres Adultes Premium</p>
            </div>
            <div class="content">
              <h2>Mot de passe modifié avec succès</h2>
              <p>Bonjour,</p>
              <p>Votre mot de passe HotMeet a été modifié avec succès.</p>
              <p>Si vous n'avez pas effectué cette modification, veuillez contacter immédiatement notre support.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 HotMeet. Tous droits réservés.</p>
              <p>Support: hotsupermeet@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email de confirmation envoyé à:', email);
    return result;
  } catch (error) {
    console.error(
      'Erreur lors de l\\' + 'envoi de l\\' + 'email de confirmation:',
      error
    );
    throw error;
  }
};

// Email marketing pour utilisateurs non-premium
const sendMarketingEmail = async (email, userName = 'Membre') => {
  console.log('📧 === DÉBUT ENVOI EMAIL MARKETING ===');
  console.log('📧 Destinataire:', email);

  try {
    const transporter = createTransporter();

    if (!transporter) {
      throw new Error('Impossible de créer le transporteur email');
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: '🔥 On a amélioré votre expérience sur HotMeet !',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { 
              display: inline-block; 
              background: linear-gradient(135deg, #ff6b6b, #ff8e8e); 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 8px; 
              margin: 20px 0;
              font-weight: bold;
              text-align: center;
            }
            .features { 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .feature-item {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .emoji { font-size: 1.2em; margin-right: 8px; }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              color: #666; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 HotMeet</h1>
              <p>Nouvelles fonctionnalités disponibles !</p>
            </div>
            <div class="content">
              <h2>Salut ${userName} !</h2>
              <p><strong>On a amélioré votre expérience sur HotMeet !</strong></p>
              
              <div class="features">
                <h3>✨ Désormais, tous les membres non-Premium peuvent :</h3>
                <div class="feature-item">
                  <span class="emoji">👥</span><strong>Explorer l'annuaire des membres et visiter les profils</strong>
                </div>
                <div class="feature-item">
                  <span class="emoji">📸</span><strong>Demander des photos privées à d'autres membres</strong>
                </div>
                <div class="feature-item">
                  <span class="emoji">💬</span><strong>Envoyer des messages pour échanger et faire connaissance</strong>
                </div>
              </div>
              
              <p>Rejoignez vite HotMeet pour découvrir toutes ces nouveautés et reconnecter avec vos contacts ! 🔥</p>
              
              <div style="text-align: center;">
                <a href="https://www.hotsupermeet.com" class="button">🚀 Accéder à HotMeet</a>
              </div>
              
              <p style="text-align: center; margin-top: 20px;">
                <strong>L'équipe HotMeet 💫</strong>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2024 HotMeet. Tous droits réservés.</p>
              <p>Support: hotsupermeet@gmail.com</p>
              <p><small>Pour vous désabonner de ces emails, contactez-nous</small></p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log("📧 Tentative d'envoi email marketing...");
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL MARKETING ENVOYÉ !');
    console.log('📧 Résultat:', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email marketing:', error.message);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmation,
  sendMarketingEmail,
};
