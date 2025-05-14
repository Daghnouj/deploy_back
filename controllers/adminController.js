const nodemailer = require("nodemailer");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const crypto = require('crypto');
const Request = require('../models/Request');
const path = require("path");
const fs = require("fs");

exports.adminSignup = async (req, res) => {
  try {
    const { nom, email, mdp } = req.body;
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: "Admin existe déjà" });

    const hashedPassword = await bcrypt.hash(mdp, 10);
    const admin = new Admin({ nom, email, mdp: hashedPassword });
    await admin.save();
    res.status(201).json({ message: "Compte admin créé !" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription", error });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, mdp } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Admin non trouvé" });

    const isMatch = await bcrypt.compare(mdp, admin.mdp);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, role: "admin" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion", error });
  }
};

exports.verifyProfessional = async (req, res) => {
  try {
    const { professionalId } = req.params; 

    // Met à jour le champ is_verified dans le document User
    const user = await User.findByIdAndUpdate(
      professionalId,
      { is_verified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Envoi de l'email de confirmation
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Validation de votre compte professionnel - Solidarity",
      text: `
Bonjour ${user.nom},

Nous avons le plaisir de vous informer que votre compte professionnel sur l'application Solidarity a été validé avec succès.

Vous pouvez désormais accéder à toutes les fonctionnalités réservées aux professionnels. Connectez-vous dès maintenant pour explorer et profiter de nos services.

Si vous avez des questions ou rencontrez des difficultés, n'hésitez pas à nous contacter à l'adresse suivante : support@solidarity.com.

Bien cordialement,
L'équipe de Solidarity
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Professionnel validé et email envoyé", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la validation du professionnel", error: error.message });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    
    const users = await User.find(filter, "-mdp");
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
// Fonction pour mettre à jour le statut actif/inactif
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, select: "-mdp" }
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Statut utilisateur mis à jour", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour du statut",
      error: error.message 
    });
  }
};

// Fonction pour modifier un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Empêche la modification du rôle et des champs sensibles
    delete updates.role;
    delete updates.oauthProvider;
    delete updates.oauthId;

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, select: "-mdp" }
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Utilisateur mis à jour avec succès", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour de l'utilisateur",
      error: error.message 
    });
  }
};

// Fonction pour supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Erreur lors de la suppression de l'utilisateur",
      error: error.message 
    });
  }
};

// Génère un OTP à 6 chiffres
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin non trouvé" });
    }

    // Génération et stockage OTP
    const otp = generateOTP();
    admin.otp = otp;
    admin.otpExpires = Date.now() + 600000; // 10 minutes
    await admin.save();

    // Envoi de l'email avec OTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: '🔑 OTP de réinitialisation - Solidarity Admin',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Réinitialisation du mot de passe administrateur</h2>
          <p>Votre code OTP de réinitialisation :</p>
          <div style="font-size: 24px; font-weight: bold; color: #007bff;">
            ${otp}
          </div>
          <p style="color: #dc3545;">Ce code expirera dans 10 minutes</p>
        </div>
      `
    });

    res.json({ 
      message: 'OTP envoyé avec succès',
      adminId: admin._id // Envoyer l'ID admin au frontend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { adminId, otp } = req.body;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin non trouvé" });
    }

    // Vérification plus robuste
    if (!admin.otp || !admin.otpExpires) {
      return res.status(400).json({ message: 'Aucun OTP en attente' });
    }

    if (admin.otp !== otp.trim()) {
      return res.status(400).json({ message: 'OTP invalide' });
    }

    if (admin.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expiré' });
    }

    // Réinitialisation
    admin.otp = undefined;
    admin.otpExpires = undefined;
    await admin.save();

    res.json({ message: 'OTP validé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { adminId, newPassword } = req.body;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin non trouvé" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.mdp = hashedPassword;
    await admin.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
exports.getUnverifiedProfessionalsRequests = async (req, res) => {
  try {
    // Récupère les demandes avec les professionnels non vérifiés
    const requests = await Request.find()
      .populate({
        path: 'professional',
        match: { 
          is_verified: false,
          role: 'professional'
        },
        select: '-mdp' // Exclure le mot de passe
      })
      .exec();

    // Filtre les résultats où le professional existe (populate ne retourne pas null)
    const filteredRequests = requests.filter(request => request.professional !== null);

    res.json({ requests: filteredRequests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des demandes",
      error: error.message 
    });
  }
};

// Récupérer les informations de l'admin connecté
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-mdp");
    if (!admin) return res.status(404).json({ message: "Administrateur non trouvé" });
    res.json(admin);
  } catch (error) {
    console.error("Erreur dans getAdminProfile:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour le profil de l'admin
exports.updateAdminProfile = async (req, res) => {
  try {
    const { email, nom ,phone} = req.body;
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.id,
      { email, nom,phone },
      { new: true }
    ).select("-mdp");
    res.json(updatedAdmin);
  } catch (error) {
    console.error("Erreur dans updateAdminProfile:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Modifier le mot de passe de l'admin
exports.updateAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Vérifier que tous les champs sont fournis
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Récupérer l'administrateur
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé.' });
    }

    // Vérifier l'ancien mot de passe
    const isMatch = await bcrypt.compare(oldPassword, admin.mdp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Ancien mot de passe incorrect.' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.mdp = hashedPassword;
    await admin.save();

    // Répondre avec un message de succès
    res.json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur dans updateAdminPassword:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// Supprimer le compte de l'admin
exports.deleteAdminAccount = async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.user.id);
    res.json({ message: "Compte administrateur supprimé avec succès." });
  } catch (error) {
    console.error("Erreur dans deleteAdminAccount:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour l'image de profil de l'administrateur
exports.updateAdminProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucune image fournie" });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: "Administrateur non trouvé" });

    // Supprimer l'ancienne image si elle existe
    if (admin.photo) {
      const oldImagePath = path.join(__dirname, "../uploads/admins/", admin.photo);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Mettre à jour le profil avec la nouvelle image
    admin.photo = req.file.filename;
    await admin.save();

    res.json({ message: "Photo de profil mise à jour avec succès", photo: admin.photo });
  } catch (error) {
    console.error("Erreur dans updateAdminProfilePhoto:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.logout = async (req, res) => {
  try {
      res.clearCookie("token"); 
      return res.status(200).json({ message: "Déconnexion réussie" });
  } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      res.status(500).json({ message: "Erreur serveur" });
  }
};
