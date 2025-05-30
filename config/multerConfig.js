const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// Crée un storage spécifique pour Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'uploads/others';

    // Utilise la logique actuelle de ton multer pour choisir le dossier
    if (file.fieldname === 'video') folder = 'uploads/videos';
    else if (file.fieldname === 'logo') folder = 'uploads/logos';
    else if (file.fieldname === 'photo') folder = 'uploads/events';
    else if (file.fieldname === 'logos') folder = 'uploads/partenaires';
    else if (file.fieldname === 'adminPhoto') folder = 'uploads/admins';
    else if (file.fieldname === 'messageImage') folder = 'uploads/messages';

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
      resource_type: file.fieldname === 'video' ? 'video' : 'image'
    };
  }
});

// Multer avec storage Cloudinary
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;
