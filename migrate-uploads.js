// migration-script.js
const User = require('./models/User');
const cloudinary = require('./config/cloudinary');

async function migrateUserPhotos() {
  const users = await User.find({ photo: { $exists: true, $ne: null } });
  
  for (const user of users) {
    if (user.photo && !user.photo.startsWith('http')) {
      try {
        // Upload de l'image locale vers Cloudinary
        const result = await cloudinary.uploader.upload(
          `./uploads/${user.photo}`,
          { folder: 'uploads/users' }
        );
        
        // Mettre à jour l'utilisateur
        user.photo = result.secure_url;
        user.photoPublicId = result.public_id;
        await user.save();
        
        console.log(`Migré: ${user.email}`);
      } catch (error) {
        console.error(`Erreur migration ${user.email}:`, error);
      }
    }
  }
}

migrateUserPhotos();