const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'uploads'); // Dossier source local
const destDir = '/data/uploads'; // Dossier sur le volume persistant

console.log(`⚙️ Début de la migration des fichiers...`);
console.log(`Source: ${sourceDir}`);
console.log(`Destination: ${destDir}`);

// Vérifier si le dossier source existe
if (!fs.existsSync(sourceDir)) {
  console.error('❌ Erreur: Le dossier source n\'existe pas');
  process.exit(1);
}

// Créer le dossier de destination si nécessaire
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`📁 Dossier de destination créé: ${destDir}`);
}

// Fonction de copie récursive
function copyFolderRecursive(source, target) {
  // Créer le dossier cible s'il n'existe pas
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  // Lire les éléments du dossier source
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const srcPath = path.join(source, item);
    const destPath = path.join(target, item);
    
    const stat = fs.lstatSync(srcPath);
    
    if (stat.isDirectory()) {
      // Copier les sous-dossiers récursivement
      copyFolderRecursive(srcPath, destPath);
    } else {
      // Copier les fichiers
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Fichier copié: ${item}`);
    }
  }
}

// Lancer la migration
try {
  copyFolderRecursive(sourceDir, destDir);
  console.log('🎉 Migration terminée avec succès !');
} catch (error) {
  console.error('❌ Erreur lors de la migration:', error);
}