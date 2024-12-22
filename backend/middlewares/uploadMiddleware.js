const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();
require('dotenv').config();

// Configurar Cloudinary
cloudinary.config({
    cloud_name: 'dv7ooyvmy',
    api_key: '439479121887299',
    api_secret: 'wTSH-fbfFyufhklaNJcGxn-gmfc'
});

// Configurar el almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chat-images', // Carpeta en Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
    },
});

const upload = multer({ storage });

// Endpoint para subir imágenes
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ninguna imagen.');
    }

    const imageUrl = req.file.path; // URL pública en Cloudinary
    res.json({ imageUrl });
});

module.exports = router;