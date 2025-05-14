const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require("../middlewares/protect.js");

router.post('/bookings', protect, bookingController.submitBooking);

router.get('/specialites',protect, bookingController.getSpecialites);

router.get('/therapists/:specialite', protect, bookingController.getTherapistsBySpecialite);

// NOUVELLE ROUTE : obtenir les créneaux disponibles d'un thérapeute
router.get('/availabilities/:therapistId', protect, bookingController.getAvailableSlots);
router.get('/therapist',  protect,  bookingController.getBookingsForTherapist );
router.patch('/:id/status', protect, bookingController.updateBookingStatus);
router.get('/user', protect, bookingController.getUserBookings);
router.patch('/:id/cancel', protect, bookingController.cancelBooking);

module.exports = router;
 
