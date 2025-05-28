require('dotenv').config();
const Twilio = require('twilio');

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendBookingStatusSMS = async (rawNumber, status, patientName) => {
  try {  
    // 1. Configuration du message
    const messages = {
      confirmed: {
        fr: `Bonjour ${patientName}, votre rendez-vous est confirmé ✅\n\nMerci de nous faire confiance !\nSolidarity+ ☎ +216 22 407 434`,
        en: `Dear ${patientName}, your appointment is confirmed ✅\n\nThank you for choosing us!\nSolidarity ☎ +216 22 407 434`
      },
      cancelled: {
        fr: `Bonjour ${patientName}, votre rendez-vous est annulé ❌\n\nContactez-nous pour reprogrammer :\n☎ +216 22 407 434\nSolidarity`,
        en: `Dear ${patientName}, your appointment is cancelled ❌\n\nPlease contact us to reschedule:\n☎ +216 22 407 434\nSolidarity`
      }
    };

    // 2. Normalisation du numéro de téléphone
    let normalizedNumber = rawNumber.replace(/\s/g, ''); // Supprimer tous les espaces
    
    // Si le numéro commence par 0 ou rien (cas tunisien)
    if (/^(0|\+216)?[0-9]{8}$/.test(normalizedNumber)) {
      if (normalizedNumber.startsWith('0')) {
        normalizedNumber = '+216' + normalizedNumber.substring(1);
      } else if (!normalizedNumber.startsWith('+')) {
        normalizedNumber = '+216' + normalizedNumber;
      }
    }
    // Sinon, on suppose que c'est un numéro international déjà bien formaté

    // 3. Détection de la langue
    const lang = normalizedNumber.startsWith('+216') ? 'fr' : 'en';

    // 4. Formatage visuel pour les logs
    const formattedTo = normalizedNumber.startsWith('+216') ? 
      normalizedNumber.replace(/(\d{2})(\d{2})(\d{3})(\d{3})/, '+$1 $2 $3 $4') : 
      normalizedNumber.replace(/(\d{1,3})(\d{3})(\d{3})(.*)/, '+$1 $2 $3 $4');

    // 5. Envoi avec template professionnel
    const response = await client.messages.create({
      body: messages[status][lang],
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedNumber,
      validityPeriod: 3600, // Validité 1h
      smartEncoded: true // Encodage spécial caractères
    });

    console.log('📱 SMS envoyé:', {
      id: response.sid,
      to: formattedTo,
      length: response.body.length
    });

    return { 
      success: true,
      messageId: response.sid,
      preview: messages[status][lang] // Retourne le preview du message
    };

  } catch (error) {
    console.error('🚨 Erreur SMS:', {
      code: error.code,
      statut: error.status,
      details: error.message,
      numéro: rawNumber
    }); 
    
    return { 
      success: false,
      errorCode: error.code,
      errorMessage: error.message.includes('trial') ? 
        'Compte non activé - Vérifiez votre abonnement Twilio' : 
        'Erreur technique - Contactez le support'
    };
  }
};