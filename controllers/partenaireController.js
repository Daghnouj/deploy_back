const Partenaire = require("../models/Partenaire");

exports.createPartenaire = async (req, res) => {
  try {
    const { link, nom, email, telephone, adresse, description, service } = req.body;
    const logo = req.file ? req.file.filename : null;

    // Vérifier si un partenaire avec cet email existe déjà
    const existing = await Partenaire.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Un partenaire avec cet email existe déjà." });
    }

    const partenaire = new Partenaire({
      link,
      nom,
      email,
      telephone,
      adresse,
      description,
      service,
      logo,
    });
    await partenaire.save();
    res.status(201).json({ message: "Partenaire créé avec succès", partenaire });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création du partenaire", error });
  }
};

exports.getPartenaires = async (req, res) => {
  try {
    const partenaires = await Partenaire.find();
    res.status(200).json(partenaires);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des partenaires", error });
  }
};

exports.getPartenaireById = async (req, res) => {
  try {
    const partenaire = await Partenaire.findById(req.params.id);
    if (!partenaire) {
      return res.status(404).json({ message: "Partenaire non trouvé" });
    }
    res.status(200).json(partenaire);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.updatePartenaire = async (req, res) => {
  try {
    const {link, nom, email, telephone, adresse, description, service } = req.body;
    // Si un nouveau logo est uploadé, utilisez-le sinon gardez l'existant
    const logo = req.file ? req.file.filename : req.body.logo;

    const partenaire = await Partenaire.findByIdAndUpdate(
      req.params.id,
      { link, nom, email, telephone, adresse, description, service, logo },
      { new: true }
    );
    if (!partenaire) {
      return res.status(404).json({ message: "Partenaire non trouvé" });
    }
    res.status(200).json({ message: "Partenaire mis à jour", partenaire });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du partenaire", error });
  }
};

exports.deletePartenaire = async (req, res) => {
  try {
    const partenaire = await Partenaire.findByIdAndDelete(req.params.id);
    if (!partenaire) {
      return res.status(404).json({ message: "Partenaire non trouvé" });
    }
    res.status(200).json({ message: "Partenaire supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression du partenaire", error });
  }
};
