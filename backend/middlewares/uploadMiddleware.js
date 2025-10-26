const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../configs/cloudinaryConfig');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const steganographyDetector = require('../services/steganographyDetector');
const { steganographyWorkerPool } = require('../services/workerPool');
const AuditLog = require('../models/AuditLog');
const router = express.Router();
require('dotenv').config();

// Temporary storage for analysis
const tempStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const tempDir = path.join(__dirname, '../temp');
        try {
            await fs.mkdir(tempDir, { recursive: true });
            cb(null, tempDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, and PDF are allowed.'), false);
    }
};

// Configure multer for temporary storage
const upload = multer({
    storage: tempStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: fileFilter
});

// Cloudinary storage (for files that pass security checks)
const cloudinaryStorageConfig = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chat-images',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'pdf'],
        resource_type: 'auto'
    },
});

// Endpoint to upload files with steganography detection
router.post('/upload', upload.single('file'), async (req, res) => {
    let tempFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        tempFilePath = req.file.path;
        const { roomPin, username } = req.body;
        
        // Get room type to determine if multimedia is allowed
        const Room = require('../models/Room');
        const room = await Room.findOne({ pin: roomPin });
        
        if (!room) {
            await fs.unlink(tempFilePath);
            return res.status(404).json({ error: 'Room not found' });
        }
        
        if (room.type !== 'multimedia') {
            await fs.unlink(tempFilePath);
            return res.status(403).json({ error: 'File uploads not allowed in text-only rooms' });
        }
        
        // Analyze file for steganography using worker thread
        console.log('Analyzing file for steganography...');
        const analysisResult = await steganographyWorkerPool.executeTask({
            filePath: tempFilePath,
            fileType: req.file.mimetype,
            threshold: 7.5
        });
        
        if (!analysisResult.success) {
            await fs.unlink(tempFilePath);
            return res.status(500).json({ error: 'Error analyzing file' });
        }
        
        const analysis = analysisResult.result;
        
        // Log the analysis
        await AuditLog.createLog({
            action: analysis.suspicious ? 'FILE_REJECTED' : 'UPLOAD_FILE',
            userId: req.ip || 'unknown',
            username: username || 'anonymous',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            roomPin,
            details: {
                filename: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                analysis: analysis,
                suspicious: analysis.suspicious
            }
        });
        
        // If file is suspicious, reject it
        if (analysis.suspicious) {
            await fs.unlink(tempFilePath);
            return res.status(403).json({
                error: 'File rejected: Potential steganography or hidden data detected',
                details: {
                    entropy: analysis.entropy,
                    reason: analysis.lsbAnalysis?.reason || analysis.channelAnalysis?.reason || 'Suspicious patterns detected'
                }
            });
        }
        
        // File passed security checks, upload to Cloudinary
        console.log('File passed security checks, uploading to Cloudinary...');
        
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'chat-images',
            resource_type: 'auto'
        });
        
        // Delete temporary file
        await fs.unlink(tempFilePath);
        
        res.json({
            success: true,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            securityCheck: {
                passed: true,
                entropy: analysis.entropy
            }
        });
        
    } catch (error) {
        console.error('Error uploading file:', error);
        
        // Clean up temporary file
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (unlinkError) {
                console.error('Error deleting temp file:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Error uploading file: ' + error.message });
    }
});

// Legacy endpoint for simple image upload (for backward compatibility)
router.post('/upload-image', upload.single('image'), async (req, res) => {
    let tempFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        
        tempFilePath = req.file.path;
        
        // Quick entropy check
        const analysisResult = await steganographyWorkerPool.executeTask({
            filePath: tempFilePath,
            fileType: req.file.mimetype,
            threshold: 7.5
        });
        
        if (analysisResult.success && analysisResult.result.suspicious) {
            await fs.unlink(tempFilePath);
            return res.status(403).json({
                error: 'Image rejected due to security concerns'
            });
        }
        
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'chat-images'
        });
        
        await fs.unlink(tempFilePath);
        
        res.json({ imageUrl: uploadResult.secure_url });
        
    } catch (error) {
        console.error('Error uploading image:', error);
        
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (unlinkError) {
                console.error('Error deleting temp file:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Error uploading image' });
    }
});

module.exports = router;