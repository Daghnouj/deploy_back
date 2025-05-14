const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: [true, 'Le nom est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
  },
  type: { 
    type: String, 
    required: [true, 'Le type est requis'],
    enum: {
      values: ["Centre de Sport", "Therapy Location"],
      message: 'Type invalide. Choisissez entre: {values}'
    }
  },
  date: { 
    type: Date, 
    required: [true, 'La date est requise'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'La date doit être dans le futur'
    }
  },
  adresse: { 
    type: String, 
    required: [true, 'L\'adresse est requise'],
    validate: {
      validator: function(v) {
        // Validation plus permissive avec support Unicode
        return /^[\p{L}0-9\s,.'-()]{5,}$/u.test(v);
      },
      message: "Adresse invalide (caractères spéciaux non autorisés)"
    }
  },
  photo: { 
    type: String, 
    required: [true, 'La photo est requise'],
    match: [/\.(jpe?g|png|webp)$/i, 'Format d\'image non supporté'] 
  },
  description: { 
    type: String,
    maxlength: [1000, 'La description ne peut dépasser 1000 caractères'] 
  },
  organisateur: { 
    type: String, 
    required: [true, 'L\'organisateur est requis'],
    trim: true
  },
  activitesCentres: { 
    type: [String], 
    required: [true, 'Au moins une activité est requise'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && 
               v.length > 0 && 
               v.every(item => item.length >= 2);
      },
      message: "Doit contenir au moins une activité valide (2 caractères minimum par activité)"
    }
  },
  localisationLink: { 
    type: String,
    match: [
      /^(https?:\/\/)[^\s/$.?#][^\s]*$/i, 
      "L'URL doit commencer par http:// ou https:// et être valide"
    ]
  },    
  localisation: {
    type: {
      type: String,
      default: "Point",
      enum: {
        values: ["Point"],
        message: 'Type de localisation invalide'
      }
    },  
    coordinates: {
      type: [Number],
      required: [true, 'Les coordonnées GPS sont requises'],
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: "Coordonnées GPS invalides (format: [longitude, latitude])"
      }
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true 
  }
});

// Indexation géospatiale
EventSchema.index({ localisation: '2dsphere' });

// Cleanup des anciens index
EventSchema.statics.cleanupOldIndexes = async function() {
  try {
    const collection = this.collection;
    const indexes = await collection.getIndexes();
    
    // Suppression des index créés par les anciennes versions
    const indexesToRemove = Object.keys(indexes)
      .filter(name => name.startsWith('adresse_') || name === 'idevent_1');
    
    for (const indexName of indexesToRemove) {
      await collection.dropIndex(indexName);
      console.log(`Index ${indexName} supprimé`);
    }
  } catch (error) {
    if (error.code !== 26) { // Ignorer l'erreur si l'index n'existe pas
      console.error("Erreur lors du cleanup des indexes:", error);
    }
  }
};

module.exports = mongoose.model("Event", EventSchema);