const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const upload = require('../config/multerConfig'); 

// On attend 4 fichiers avec le champ `photo`
router.post('/', 
  upload.array('photo', 4), 
  eventController.createEvent
);router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.put('/:id', upload.array('photo', 4), eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
   