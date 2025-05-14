// availabilityRoutes.js
const express = require("express");

const {
  addAvailability,
  deleteAvailability,
  getAvailabilities,
  getColorOptions,
  getProfessionals,
  updateAvailability,
} = require("../controllers/availabilityController.js");

const { protect } = require("../middlewares/protect.js");

const router = express.Router();

router.post("/availabilities", protect, addAvailability);
router.get("/availabilities", protect, getAvailabilities);
router.put("/availabilities/:id", protect, updateAvailability);
router.delete("/availabilities/:id", protect, deleteAvailability);
router.get("/colors", protect, getColorOptions);
router.get("/professionals", protect, getProfessionals);

module.exports = router;
