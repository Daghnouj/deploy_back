const fs = require('fs');

console.log("🔧 Correction des permissions...");

const dirs = [
  '/data/uploads',
  '/tmp/uploads'
];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      // Modifier les permissions
      fs.chmodSync(dir, 0o755);
      console.log(`✅ Permissions corrigées pour ${dir}`);
    } catch (err) {
      console.error(`⚠️ Impossible de corriger ${dir}: ${err.message}`);
    }
  }
});