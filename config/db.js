
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    // Ajoutez ces options supplémentaires
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true, // Important pour la stabilité
      ssl: true,
      authSource: 'admin',
    });
    
    console.log("MongoDB connecté...");
    return mongoose.connection.getClient(); // Retourne le client MongoDB

  } catch (error) {
    console.error("Erreur de connexion MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB; 