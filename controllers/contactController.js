const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');

exports.createContact = async (req, res) => {
  try {
    const { firstName, lastName, email, city, phone, subject, message } = req.body;
    
    // Création du contact
    const newContact = new Contact({ 
      firstName, 
      lastName, 
      email, 
      city, 
      phone, 
      subject, 
      message 
    });
    await newContact.save();

    // Configuration du transporteur email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email pour l'admin (version texte simple)
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: subject, // Utilisation directe du sujet du formulaire
      text: `
        Nom: ${firstName} ${lastName}
        Email: ${email}
        Téléphone: ${phone}
        Ville: ${city}
        Sujet: ${subject}
        Message: ${message}
      `
    };

    // Email de confirmation pour l'utilisateur
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Confirmation: ${subject}`, // Sujet personnalisé avec le sujet original
      text: `
        Bonjour ${firstName},

        Nous avons bien reçu votre message concernant "${subject}".
        
        Nous vous répondrons dans les plus brefs délais.

        Cordialement,
        L'équipe de Solidarity

        ----------------------------------
        Récapitulatif de votre message :
        Sujet: ${subject}
        Message: ${message}
      `
    };

    // Envoi des emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: newContact
    });

  } catch (error) {
    console.error('Erreur:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages
      });
    }
    
    // Gestion spécifique des erreurs d'envoi d'email
    if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
      return res.status(500).json({
        success: false,
        message: 'Erreur d\'envoi d\'email'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};