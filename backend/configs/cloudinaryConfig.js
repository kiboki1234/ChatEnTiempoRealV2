const cloudinary = require('cloudinary').v2;

// Configurar credenciales de Cloudinary
cloudinary.config({
    cloud_name: 'dv7ooyvmy',
    api_key: '439479121887299',
    api_secret: 'wTSH-fbfFyufhklaNJcGxn-gmfc'
});

module.exports = cloudinary;
