const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Création des dossiers s'ils n'existent pas
const createUploadDirs = () => {
  const baseDir = path.join(__dirname, '../uploads');
  const dirs = [
    'videos',
    'logos',
    'events',
    'partenaires',
    'admins',
    'messages',
    'others'
  ];

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);
  
  dirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  });
};

createUploadDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const basePath = path.join(__dirname, '../uploads');
    
    if (file.fieldname === 'video') {
      cb(null, path.join(basePath, 'videos'));
    } else if (file.fieldname === 'logo') {
      cb(null, path.join(basePath, 'logos'));
    } else if (file.fieldname === 'photo') {
      cb(null, path.join(basePath, 'events'));
    } else if (file.fieldname === 'logos') { 
      cb(null, path.join(basePath, 'partenaires'));
    } else if (file.fieldname === "adminPhoto") {
      cb(null, path.join(basePath, 'admins'));
    } else if (file.fieldname === "messageImage") {
      cb(null, path.join(basePath, 'messages'));
    } else {
      cb(null, path.join(basePath, 'others'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageFields = ['logo', 'photo', 'adminPhoto', 'logos', 'messageImage'];
  
  if (file.fieldname === 'video') {
    file.mimetype.startsWith('video/') 
      ? cb(null, true)
      : cb(new Error('Le fichier doit être une vidéo !'), false);
  } 
  else if (allowedImageFields.includes(file.fieldname)) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    allowedTypes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Le fichier doit être une image (JPEG, PNG, GIF) !'), false);
  } 
  else {
    cb(new Error('Champ non supporté'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;