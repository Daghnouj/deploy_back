// routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const uploadImage = require("../config/multerConfig");

// Créer un événement (POST) - admin
router.post("/", uploadImage.single("photo"), eventController.createEvent);
 
// Récupérer tous les événements (GET)
router.get("/", eventController.getEvents);
 
// Récupérer un événement par son ID (GET)
router.get("/:id", eventController.getEventById);

// Mettre à jour un événement (PUT) - admin
router.put("/:id", uploadImage.single("photo"), eventController.updateEvent);

// Supprimer un événement (DELETE) - admin
router.delete("/:id", eventController.deleteEvent);

router.get("/nearby", eventController.getNearbyEvents);

module.exports = router;
