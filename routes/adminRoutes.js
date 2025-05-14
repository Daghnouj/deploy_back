const express = require("express");
const path = require("path");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const multer = require("multer"); // Ajout si nécessaire
const upload = multer({ dest: "uploads/admins/" });

const { 
  verifyProfessional,
  getAllUsers,
  adminSignup,
  adminLogin,
  updateUserStatus,
  updateUser,
  deleteUser,
  verifyOTP,
  forgotPassword,
  changePassword,
  getRequests,
  getUnverifiedProfessionalsRequests,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  deleteAdminAccount,
  updateAdminProfilePhoto,
  logout
} = require("../controllers/adminController");

// Authentification Admin
router.post("/signup", adminSignup);
router.post("/login", adminLogin);

// Gestion des utilisateurs
router.get("/users", authMiddleware({ adminOnly: true }), getAllUsers);
router.patch("/users/:id/status", authMiddleware({ adminOnly: true }), updateUserStatus);
router.put("/users/:id", authMiddleware({ adminOnly: true }), updateUser);
router.delete("/users/:id", authMiddleware({ adminOnly: true }), deleteUser);

// Validation des professionnels
router.put("/verify/:professionalId", authMiddleware({ adminOnly: true }), verifyProfessional);
router.get("/unverified-requests", getUnverifiedProfessionalsRequests);

// Gestion du mot de passe
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/change-password", changePassword);
router.post("/logout", authMiddleware({ adminOnly: true }), logout);


// Téléchargement de fichiers
router.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../uploads", req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error("Erreur lors du téléchargement du fichier", err);
      res.status(500).send("Erreur lors du téléchargement du fichier");
    }
  });
});

// Gestion du profil admin
router.get("/profile", authMiddleware({ adminOnly: true }), getAdminProfile);
router.put("/profile", authMiddleware({ adminOnly: true }), updateAdminProfile);
router.put("/password", authMiddleware({ adminOnly: true }), updateAdminPassword);
router.delete("/delete", authMiddleware({ adminOnly: true }), deleteAdminAccount);

// Gestion de la photo de profil
router.put(
  "/profile-photo",
  authMiddleware({ adminOnly: true }),
  upload.single("adminPhoto"),
  updateAdminProfilePhoto
);

module.exports = router;
