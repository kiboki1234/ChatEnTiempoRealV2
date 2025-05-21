const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../configs/cloudinaryConfig');
const router = express.Router();

// Configurar almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chat-images', // Carpeta en Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
    },
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Aumentado a 10MB
        files: 1,
        fields: 5
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo imágenes
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif)'), false);
        }
        cb(null, true);
    }
});

// Endpoint para cargar imágenes
router.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ninguna imagen.' });
        }
        console.log('Imagen subida a Cloudinary:', req.file.path);
        res.status(200).json({ imageUrl: req.file.path });
    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ error: 'Error al procesar la imagen' });
    }
});

// Endpoint para obtener mensajes
const { getMessages } = require('../controllers/chatController');
router.get('/', getMessages);

module.exports = router;
