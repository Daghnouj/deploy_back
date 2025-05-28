const express = require("express");
const router = express.Router();
const partenaireController = require("../controllers/partenaireController");
const upload = require("../config/multerConfig");

// Créer un partenaire (admin)
router.post("/", upload.single("logos"), partenaireController.createPartenaire);

// Récupérer tous les partenaires
router.get("/", partenaireController.getPartenaires);

// Récupérer un partenaire par ID
router.get("/:id", partenaireController.getPartenaireById); 

// Mettre à jour un partenaire (admin)
router.put("/:id", upload.single("logos"), partenaireController.updatePartenaire);

// Supprimer un partenaire (admin)
router.delete("/:id", partenaireController.deletePartenaire);

module.exports = router;
  