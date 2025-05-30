const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Fonction sécurisée pour créer des dossiers
const safeCreateDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      // Création avec permissions étendues
      fs.mkdirSync(dirPath, { 
        recursive: true,
        mode: 0o755 // rwxr-xr-x
      });
      console.log(`📁 Dossier créé: ${dirPath}`);
    }
  } catch (err) {
    console.error(`❌ Erreur création dossier: ${err.message}`);
    
    // Solution de secours pour Render
    if (process.env.NODE_ENV === 'production') {
      console.log("🔄 Utilisation du dossier temporaire /tmp/uploads");
      return '/tmp/uploads';
    }
    throw err;
  }
};

// Détermination du chemin de base
const getBaseDir = () => {
  if (process.env.NODE_ENV === 'production') {
    // Essayer /data/uploads, sinon utiliser /tmp
    const dataDir = '/data/uploads';
    try {
      safeCreateDir(dataDir);
      return dataDir;
    } catch {
      return '/tmp/uploads';
    }
  }
  return path.join(__dirname, '../uploads');
};

const baseDir = getBaseDir();

// Création des sous-dossiers
const createUploadDirs = () => {
  const dirs = ['videos', 'logos', 'events', 'partenaires', 'admins', 'messages', 'others'];
  
  dirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    safeCreateDir(dirPath);
  });
};

createUploadDirs();

// Configuration Multer (inchangée)
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
    safeCreateDir(fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// Filtrage des fichiers (inchangé)
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

// Initialisation de Multer (inchangée)
const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = upload;