const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Détermination du chemin de base dynamique
const getBaseDir = () => {
  // En production: utilise le volume persistant de Render
  if (process.env.NODE_ENV === 'production') {
    return '/data/uploads';
  }
  // En développement: dossier local
  return path.join(__dirname, '../uploads');
};

const baseDir = getBaseDir();

// Création des dossiers nécessaires
const createUploadDirs = () => {
  const dirs = [
    'videos',
    'logos',
    'events',
    'partenaires',
    'admins',
    'messages',
    'others'
  ];

  // Créer le dossier principal s'il n'existe pas
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`📁 Dossier principal créé: ${baseDir}`);
  }
  
  // Créer les sous-dossiers
  dirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📂 Sous-dossier créé: ${dirPath}`);
    }
  });
};

createUploadDirs();

// Configuration du stockage Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fieldToFolder = {
      'video': 'videos',
      'logo': 'logos',
      'photo': 'events',
      'logos': 'partenaires',
      'adminPhoto': 'admins',
      'messageImage': 'messages'
    };
    
    const folder = fieldToFolder[file.fieldname] || 'others';
    const fullPath = path.join(baseDir, folder);
    
    // S'assurer que le dossier existe
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// Filtrage des fichiers
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

// Initialisation de Multer
const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;