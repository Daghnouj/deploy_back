// routes/passwordRoutes.js
const express = require("express");
const router = express.Router();
const { forgotPassword, verifyOTP, changePassword } = require("../controllers/passwordController");

// Route pour initier la réinitialisation du mot de passe (envoi d'OTP par email)
router.post("/forgot-password", forgotPassword);

// Route pour vérifier l'OTP. L'ID de l'utilisateur est passé dans l'URL.
router.post("/verify-otp/:id", verifyOTP);

// Route pour changer le mot de passe. L'ID de l'utilisateur est passé dans l'URL.
router.post("/change-password/:id", changePassword);

module.exports = router;
