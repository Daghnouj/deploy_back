// controllers/passwordController.js 
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer"); 
const redisClient = require("../config/redis");

// Générer un OTP à 6 chiffres
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Envoyer l'OTP par email
async function sendOTPEmail(email, otp, userName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "🔐 OTP pour réinitialisation du mot de passe - Solidarity",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #333; text-align: center;">🔐 Code OTP - Réinitialisation</h2>
        <p style="font-size: 16px; color: #555;">
            Bonjour <strong>${userName}</strong>,
        </p>
        <p style="font-size: 16px; color: #555;">
            Votre code OTP pour la réinitialisation de votre mot de passe est :
        </p>
        <div style="text-align: center; margin: 20px 0;">
            <span style="
                font-size: 24px;
                font-weight: bold;
                color: #ffffff;
                background-color: #007BFF;
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
                letter-spacing: 2px;">
                ${otp}
            </span>
        </div>
        <p style="font-size: 16px; color: #555;">
            Ce code expirera dans <strong>10 minutes</strong>. Ne le partagez avec personne.
        </p>
        <p style="font-size: 16px; color: #555;">
            Cordialement, <br>
            <strong>L'équipe Solidarity</strong>
        </p>
    </div>
    `,
};


  await transporter.sendMail(mailOptions);
}

// 1. Forgot Password : génère et envoie un OTP via email (basé sur l'email)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Vérifier l'existence de l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Générer un OTP et le stocker dans Redis (clé basée sur l'ID utilisateur)
    const otp = generateOTP();
    await redisClient.set(`otp:${user._id}`, otp, { EX: 600 }); // Expiration de 10 minutes

    // Envoyer l'OTP par email
    await sendOTPEmail(email, otp, user.nom);
    res.json({ message: "OTP envoyé à votre adresse email.", id: user._id });
  } catch (error) {
    console.error("Erreur dans forgotPassword:", error);
    res.status(500).json({ message: "Erreur lors de la demande de réinitialisation du mot de passe", error });
  }
};

// 2. Verify OTP : vérifie l'OTP en utilisant l'ID utilisateur passé dans l'URL
exports.verifyOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    if (!id || !otp) {
      return res.status(400).json({ message: "ID et OTP requis." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const storedOTP = await redisClient.get(`otp:${id}`);
    if (!storedOTP) {
      return res.status(400).json({ message: "OTP expiré ou non trouvé." });
    }
    if (storedOTP !== otp) {
      return res.status(400).json({ message: "OTP incorrect." });
    }
    res.json({ message: "OTP vérifié avec succès." });
  } catch (error) {
    console.error("Erreur dans verifyOTP:", error);
    res.status(500).json({ message: "Erreur lors de la vérification de l'OTP", error });
  }
};

// 3. Change Password : met à jour le mot de passe (en vérifiant newPassword et confirmPassword) via l'ID dans l'URL
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;
    if (!id || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "ID, nouveau mot de passe et confirmation requis." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.mdp = hashedPassword;
    await user.save();
    await redisClient.del(`otp:${id}`);
    res.json({ message: "Mot de passe modifié avec succès." });
  } catch (error) {
    console.error("Erreur dans changePassword:", error);
    res.status(500).json({ message: "Erreur lors du changement du mot de passe", error });
  }
};