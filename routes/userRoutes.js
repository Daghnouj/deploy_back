const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("../controllers/userController");
const { protect } = require("../middlewares/protect");
const User = require("../models/User");
const upload = require("../config/multerConfig");


// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Routes pour l'utilisateur
router.get("/profile/me", protect, userController.getProfile);
router.get("/profile/:userId", protect,userController.getProfile); // Récupérer le profil par ID
router.put("/profile/:userId", userController.updateProfile); // Mettre à jour le profil par ID
router.put("/profile/:userId/password", userController.updatePassword); // Mettre à jour le mot de passe par ID
router.put("/profile/:userId/photo", upload.single("photo"), userController.updateProfilePhoto); // Mettre à jour la photo par ID
router.delete("/profile/:userId", userController.deleteProfile); // Supprimer le profil par ID
router.put("/profile/:userId/deactivate", userController.deactivateAccount); // Désactiver le compte par ID
router.put("/profile/:userId/activate", userController.activateAccount); 
router.get('/me', protect, userController.getCurrentUser);
router.get('/:id', protect, userController.getUserById);




module.exports = router;