const express = require("express");
const router = express.Router();
const multer  = require("multer");
const User = require("../models/User");
const { google } = require('googleapis');
const Token = require('../models/Token');
const readline = require('readline');
require('dotenv').config();


const upload = multer({ dest: "uploads/" });
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/protect");

console.log(authController); // Vérifier ce qui est réellement importé

const { signup, login, submitRequest } = authController;

// router.post("/signup", signup);
router.post("/login", login);
router.post("/request", protect, upload.single("document"), submitRequest);
router.post("/logout", protect, authController.logoutUser); 
router.post("/signup", upload.single('documents'), authController.signup);
// routes/auth.js
router.get('/me', protect, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-mdp');
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  

module.exports = router;
