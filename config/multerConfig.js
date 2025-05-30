const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Correction du traitement pour adminPhoto
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'logo') {
      cb(null, 'uploads/logos/');
    } else if (file.fieldname === 'photo') {
      cb(null, 'uploads/events/');
    } else if (file.fieldname === 'logos') { 
      cb(null, 'uploads/partenaires/');
    } else if (file.fieldname === "adminPhoto") {
      cb(null, 'uploads/admins/'); // Correction ici
    } else if (file.fieldname === "messageImage") {
      cb(null, 'uploads/messages/');
    } else {
      cb(null, 'uploads/others/');
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Autorisation explicite du champ 'photo'
  const allowedImageFields = ['logo', 'photo', 'adminPhoto', 'logos', 'messageImage'];
  
  if (file.fieldname === 'video') {
    file.mimetype.startsWith('video/') 
      ? cb(null, true)
      : cb(new Error('Le fichier doit être une vidéo !'), false);
  } 
  else if (allowedImageFields.includes(file.fieldname)) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    allowedTypes.test(file.mimetype) && allowedTypes.test(ext)
      ? cb(null, true)
      : cb(new Error('Le fichier doit être une image !'), false);
  } 
  else {
    cb(new Error('Champ non supporté'), false);
  }
};

// Correction de la configuration Multer
const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;