const Galerie = require('../models/Galerie');
const mongoose = require('mongoose');
exports.createGalerie = async (req, res) => {
  try {
    console.log("Données reçues :", req.body); // 🔍 DEBUG

    const { titre, desc, categorie } = req.body;
    const video = req.file ? req.file.filename : null;

    if (!video) {
      return res.status(400).json({ message: "Une vidéo est requise" });
    }

    const newGalerie = new Galerie({ titre, desc, video, categorie });
    await newGalerie.save();
    
    res.status(201).json({ message: "Galerie ajoutée avec succès", galerie: newGalerie });
  } catch (error) {
    console.error("Erreur MongoDB :", error); // 🔍 DEBUG
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.getGaleriesByCategorie = async (req, res) => {
  try {
      const { categorie } = req.query;
      const query = categorie ? { categorie } : {};
      const galeries = await Galerie.find(query).select('titre desc video categorie views createdAt');
      if (!galeries.length) return res.status(404).json({ message: "Aucune galerie trouvée" });
      res.status(200).json(galeries);
  } catch (error) {
      res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.getGalerieById = async (req, res) => {
  try {
    const galerie = await Galerie.findById(req.params.id);
    if (!galerie) return res.status(404).json({ message: "Video not found" });
    res.json(galerie);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTopGaleries = async (req, res) => {
  try {
    const topGaleries = await Galerie.aggregate([
      {
        $project: {
          _id: 1,
          titre: 1,
          video: 1,
          desc: 1,
          categorie: 1,
          createdAt: 1,
          viewCount: { $size: "$viewedBy" } // Calcul dynamique
        }
      },
      { $sort: { viewCount: -1, createdAt: -1 } },
      { $limit: 3 }
    ]);

    res.status(200).json(topGaleries);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
exports.updateGalerie = async (req, res) => {
    try {
        const { titre, desc, categorie } = req.body;
        const video = req.file ? req.file.filename : req.body.video;

        const galerie = await Galerie.findByIdAndUpdate(
            req.params.id,
            { titre, desc, categorie, video },
            { new: true }
        );
        if (!galerie) return res.status(404).json({ message: "Galerie non trouvée" });

        res.status(200).json({ message: "Galerie mise à jour", galerie });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.deleteGalerie = async (req, res) => {
    try {
        const galerie = await Galerie.findByIdAndDelete(req.params.id);
        if (!galerie) return res.status(404).json({ message: "Galerie non trouvée" });

        res.status(200).json({ message: "Galerie supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.trackView = async (req, res) => {
  try {
    const galerie = await Galerie.findById(req.params.id);
    if (!galerie) return res.status(404).json({ message: "Vidéo non trouvée" });

    // 1. Gestion utilisateur authentifié
    if (req.user) {
      const userId = req.user._id.toString();
      const hasViewed = galerie.viewedBy.some(view => 
        view.type === 'user' && view.id === userId
      );

      if (!hasViewed) {
        galerie.viewedBy.push({
          type: 'user', // <-- Champ requis
          id: userId,
          ip: req.ip,
          device: req.headers['user-agent'],
          date: new Date()
        });
        galerie.views += 1;
      }

    // 2. Gestion utilisateur anonyme
    } else {
      const anonKey = req.ip + '-' + req.headers['user-agent'];
      const hasViewed = galerie.viewedBy.some(view => 
        view.type === 'anon' && view.ip === req.ip && view.device === req.headers['user-agent']
      );

      if (!hasViewed) {
        galerie.viewedBy.push({
          type: 'anon', // <-- Champ requis
          ip: req.ip,
          device: req.headers['user-agent'],
          date: new Date()
        });
        galerie.views += 1;
      }
    }

    await galerie.save();
    res.status(200).json({ views: galerie.views });

  } catch (error) {
    console.error('Erreur détaillée:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};