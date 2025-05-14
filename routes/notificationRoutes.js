const express = require('express');
const { 
  getUserNotifications,
  markAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/protect');

const router = express.Router();

router.get('/', protect, getUserNotifications);
router.patch('/mark-read', protect, markAsRead);

module.exports = router;