const express = require('express');
const { resolveMapLink } = require('../controllers/MapsController');

const router = express.Router();

// GET /api/maps/resolve?url=...
router.get("/resolve", resolveMapLink);

module.exports = router;