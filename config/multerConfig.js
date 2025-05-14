const multer = require('multer');
const path = require('path');

// Configuration du stockage avec destination dynamique
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
   
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'logo') {
      cb(null, 'uploads/logos/');
    } else if (file.fieldname === 'photo') {
      cb(null, 'uploads/events/');
    } 
    if (file.fieldname === 'logos') { 
      cb(null, 'uploads/partenaires/');}
    else if (file.fieldname === "adminPhoto") {
      uploadPath = "uploads/admins/";
    }
    else if (file.fieldname === "messageImage") {
      cb(null, 'uploads/messages/');}    
    else {
      cb(null, 'uploads/others/');
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Configuration du filtre pour autoriser les types de fichiers selon le champ
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Le fichier doit être une vidéo !'), false);
    }
  } else if (file.fieldname === 'logo' || file.fieldname === 'photo' || file.fieldname === 'adminPhoto' || file.fieldname === 'logos' || file.fieldname === 'messageImage') {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(file.mimetype) && allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Le fichier doit être une image !'), false);
    }
  } else {
    cb(new Error('Champ non supporté'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  fileSize: 5 * 1024 * 1024, 
  limits: { fileSize: 100 * 1024 * 1024 } // Limite de taille générale (100MB)
});

module.exports = upload;
