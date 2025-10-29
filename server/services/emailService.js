const nodemailer = require('nodemailer');

// Configuration du transporteur Gmail
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
};

// Email de réinitialisation de mot de passe
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `https://www.hotsupermeet.com/reset-password?token=${resetToken}`;

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

    const result = await transporter.sendMail(mailOptions);
    console.log('Email de réinitialisation envoyé à:', email);
    return result;
  } catch (error) {
    console.error('Erreur lors de l\\' + 'envoi de l\\' + 'email:', error);
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

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmation,
};
