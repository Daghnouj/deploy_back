const Galerie = require('../models/Galerie');

exports.createGalerie = async (req, res) => {
  try {
    const { titre, desc, categorie, video } = req.body;

    if (!video) {
      return res.status(400).json({ message: "Un lien YouTube est requis" });
    }

    const newGalerie = new Galerie({ titre, desc, video, categorie });
    await newGalerie.save();

    res.status(201).json({ message: "Galerie ajoutée avec succès", galerie: newGalerie });
  } catch (error) {
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
    if (!galerie) return res.status(404).json({ message: "Vidéo non trouvée" });
    res.json(galerie);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateGalerie = async (req, res) => {
  try {
    const { titre, desc, categorie, video } = req.body;

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

exports.getTotalVideos = async (req, res) => {
  try {
    const { categorie } = req.query;
    const query = categorie ? { categorie } : {};
    const total = await Galerie.countDocuments(query);
    res.status(200).json({ total });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.trackView = async (req, res) => {
  try {
    const galerie = await Galerie.findById(req.params.id);
    if (!galerie) return res.status(404).json({ message: "Vidéo non trouvée" });

    if (req.user) {
      const userId = req.user._id.toString();
      const hasViewed = galerie.viewedBy.some(view =>
        view.type === 'user' && view.id === userId
      );

      if (!hasViewed) {
        galerie.viewedBy.push({
          type: 'user',
          id: userId,
          ip: req.ip,
          device: req.headers['user-agent'],
          date: new Date()
        });
        galerie.views += 1;
      }
    } else {
      const hasViewed = galerie.viewedBy.some(view =>
        view.type === 'anon' && view.ip === req.ip && view.device === req.headers['user-agent']
      );

      if (!hasViewed) {
        galerie.viewedBy.push({
          type: 'anon',
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
    res.status(500).json({
      message: 'Erreur serveur',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
