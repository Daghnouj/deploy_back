const Event = require('../models/Event');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
// CREATE
exports.createEvent = async (req, res) => {
  try {
    if (!req.files || req.files.length !== 4) {
      return res.status(400).json({ error: 'Il faut exactement 4 images.' });
    }

    const invalidFiles = req.files.some(file => file.fieldname !== 'photo');
    if (invalidFiles) {
      // Supprimer les fichiers Cloudinary uploadés
      req.files.forEach(file => {
        cloudinary.uploader.destroy(file.filename)
          .catch(err => console.error('Erreur suppression fichier Cloudinary:', err));
      });
      return res.status(400).json({ error: 'Champ de fichier invalide' });
    }

    const images = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    const activities = JSON.parse(req.body.activities);

    const event = new Event({
      name: req.body.name,
      images,
      address: req.body.address,
      coordinates: req.body.coordinates,
      activities,
      description: req.body.description
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    // Supprimer les images en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        cloudinary.uploader.destroy(file.filename)
          .catch(err => console.error('Erreur nettoyage:', err));
      });
    }
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET ALL
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find();
    
    // Formater les URLs
    const formattedEvents = events.map(event => ({
      ...event._doc,
      images: event.images.map(img => img.url)
    }));
    
    res.json(formattedEvents);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET BY ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé.' });
    
    // Formater les URLs si nécessaire
    const formattedEvent = {
      ...event._doc,
      images: event.images.map(img => img.url)
    };
    
    res.json(formattedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};


// UPDATE
exports.updateEvent = async (req, res) => {
  try {
    const oldEvent = await Event.findById(req.params.id);
    if (!oldEvent) return res.status(404).json({ error: 'Événement non trouvé.' });

    let images = oldEvent.images;
    
    if (req.files && req.files.length === 4) {
      // Supprimer les anciennes images de Cloudinary
      oldEvent.images.forEach(img => {
        cloudinary.uploader.destroy(img.public_id)
          .catch(err => console.error('Erreur suppression ancienne image:', err));
      });
      
      // Préparer les nouvelles images
      images = req.files.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    }

    const activities = JSON.parse(req.body.activities);

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        images,
        address: req.body.address,
        coordinates: req.body.coordinates,
        activities,
        description: req.body.description
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    // Supprimer les nouvelles images en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        cloudinary.uploader.destroy(file.filename)
          .catch(err => console.error('Erreur nettoyage:', err));
      });
    }
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// DELETE
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé.' });

    // Supprimer les images de Cloudinary
    event.images.forEach(img => {
      cloudinary.uploader.destroy(img.public_id)
        .catch(err => console.error('Erreur suppression image:', err));
    });

    res.json({ message: 'Événement supprimé.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
