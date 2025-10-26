const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../configs/cloudinaryConfig');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const steganographyDetector = require('../services/steganographyDetector');
const quarantineService = require('../services/quarantineService');
const { steganographyWorkerPool } = require('../services/workerPool');
const AuditLog = require('../models/AuditLog');
const router = express.Router();
require('dotenv').config();

// Helper function to delete file with retries (for Windows file locks)
async function safeDeleteFile(filePath, maxRetries = 3, delayMs = 100) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            if (error.code === 'EPERM' || error.code === 'EBUSY') {
                if (i < maxRetries - 1) {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
                    continue;
                }
            }
            // If it's not a permission error or we've exhausted retries, log and continue
            console.warn(`[WARN] Could not delete temp file ${filePath}:`, error.message);
            return false;
        }
    }
    return false;
}

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
    // Tipos de archivo permitidos con límites razonables
    const allowedTypes = [
        // Imágenes
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
        // Documentos
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        // Videos
        'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm',
        // Audios
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/webm',
        // Archivos comprimidos
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed', 'application/x-7z-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Por favor, verifica los tipos de archivo permitidos.`), false);
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
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'pdf', 'mp3', 'wav', 'ogg', 'm4a'],
        resource_type: 'auto'
    },
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Error de Multer (tamaño de archivo, etc.)
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'Archivo demasiado grande',
                details: 'El tamaño máximo permitido es 10MB'
            });
        }
        return res.status(400).json({ 
            error: 'Error al procesar el archivo',
            details: err.message 
        });
    } else if (err) {
        // Error personalizado del fileFilter
        if (err.message.includes('Tipo de archivo no permitido')) {
            return res.status(400).json({ 
                error: '🚫 Tipo de archivo no permitido por seguridad',
                details: err.message,
                allowedTypes: [
                    '📷 Imágenes: JPG, PNG, GIF, WebP, BMP, SVG',
                    '📄 Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT',
                    '🎬 Videos: MP4, AVI, MOV, MKV',
                    '🎵 Audio: MP3, WAV, OGG, M4A',
                    '🗜️ Comprimidos: ZIP, RAR, 7Z'
                ],
                blockedReason: err.message.includes('x-msdownload') || err.message.includes('executable') 
                    ? '⚠️ Los archivos ejecutables (.exe, .bat, .cmd, .sh) están bloqueados por razones de seguridad'
                    : 'Este tipo de archivo no está en la lista de permitidos'
            });
        }
        return res.status(400).json({ 
            error: 'Error al subir archivo',
            details: err.message 
        });
    }
    next();
};

// Main upload endpoint with comprehensive security analysis
router.post('/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return handleMulterError(err, req, res, next);
        }
        next();
    });
}, async (req, res) => {
    let tempFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        tempFilePath = req.file.path;
        const { roomPin, username } = req.body;
        const userId = req.ip || 'unknown';
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Verificar si es chat general o sala con PIN
        let isMultimediaAllowed = true;
        
        if (roomPin && roomPin !== 'general') {
            // Get room type to determine if multimedia is allowed
            const Room = require('../models/Room');
            const room = await Room.findOne({ pin: roomPin });
            
            if (!room) {
                await safeDeleteFile(tempFilePath);
                return res.status(404).json({ error: 'Room not found' });
            }
            
            if (room.type !== 'multimedia') {
                await safeDeleteFile(tempFilePath);
                return res.status(403).json({ error: 'File uploads not allowed in text-only rooms' });
            }
        }
        // Si no hay roomPin o es 'general', permitir (chat general siempre permite multimedia)
        
        // Analyze file for steganography using worker thread
        console.log(`[SECURITY] Analyzing file: ${req.file.originalname} (${req.file.mimetype})`);
        
        let analysisResult;
        try {
            analysisResult = await steganographyWorkerPool.executeTask({
                filePath: tempFilePath,
                fileType: req.file.mimetype,
                threshold: 7.95  // Higher threshold for better accuracy
            });
        } catch (workerError) {
            console.error('[ERROR] Worker pool error:', workerError);
            await safeDeleteFile(tempFilePath);
            return res.status(500).json({ 
                error: 'Error analyzing file security',
                details: workerError.message 
            });
        }
        
        if (!analysisResult || !analysisResult.success) {
            console.error('[ERROR] Analysis failed:', analysisResult?.error || 'Unknown error');
            await safeDeleteFile(tempFilePath);
            return res.status(500).json({ 
                error: 'Error analyzing file', 
                details: analysisResult?.error || 'Analysis returned no result'
            });
        }
        
        const analysis = analysisResult.result;
        
        // Enrich analysis with security scoring
        if (!analysis.riskScore) {
            analysis.riskScore = 0;
            analysis.riskFactors = [];
            
            // Check if file type naturally has high entropy (compressed formats)
            const compressedFormats = [
                'application/pdf',
                'application/zip',
                'application/x-zip-compressed',
                'application/x-rar-compressed',
                'application/x-7z-compressed',
                'video/mp4',
                'video/mpeg',
                'video/quicktime',
                'audio/mpeg',
                'audio/mp4',
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/vnd.openxmlformats-officedocument',
                'application/vnd.ms-excel',
                'application/vnd.ms-powerpoint'
            ];
            
            const isCompressedFormat = compressedFormats.some(format => 
                req.file.mimetype.includes(format.split('/')[1]) || 
                req.file.mimetype === format
            );
            
            // Adjust entropy thresholds based on file type
            const entropyThresholds = isCompressedFormat 
                ? { critical: 7.95, high: 7.85, elevated: 7.75 }  // More lenient for compressed files
                : { critical: 7.7, high: 7.4, elevated: 7.0 };     // Stricter for uncompressed files
            
            // Calculate risk score based on entropy
            const entropy = parseFloat(analysis.entropy);
            if (entropy > entropyThresholds.critical) {
                analysis.riskScore += 4;
                analysis.riskFactors.push('Extremely high entropy detected');
            } else if (entropy > entropyThresholds.high) {
                analysis.riskScore += 2;
                analysis.riskFactors.push('High entropy detected');
            } else if (entropy > entropyThresholds.elevated) {
                analysis.riskScore += 1;
                analysis.riskFactors.push('Elevated entropy');
            }
            
            // Add risk for LSB anomalies (images only)
            if (analysis.lsbAnalysis?.suspicious) {
                analysis.riskScore += 3;
                analysis.riskFactors.push('LSB pattern anomaly');
            }
            
            // Add risk for channel anomalies (images only)
            if (analysis.channelAnalysis?.suspicious) {
                analysis.riskScore += 2;
                analysis.riskFactors.push('Color channel anomaly');
            }
            
            // Null bytes are normal in many binary formats, only flag if excessive
            if (analysis.hasNullBytes && !isCompressedFormat) {
                // Only add minor risk for null bytes in text-based formats
                if (req.file.mimetype.includes('text/') || req.file.mimetype.includes('xml')) {
                    analysis.riskScore += 2;
                    analysis.riskFactors.push('Unexpected null bytes in text file');
                }
            }
            
            // Check file size anomalies (files that are too small or suspiciously large)
            const fileSize = req.file.size;
            const expectedMinSize = {
                'application/pdf': 1000,        // PDFs are typically > 1KB
                'image/jpeg': 500,              // JPEGs are typically > 500 bytes
                'image/png': 500,
                'video/': 10000,                // Videos are typically > 10KB
                'audio/': 5000                  // Audio files are typically > 5KB
            };
            
            for (const [type, minSize] of Object.entries(expectedMinSize)) {
                if (req.file.mimetype.includes(type) && fileSize < minSize) {
                    analysis.riskScore += 2;
                    analysis.riskFactors.push(`Unusually small ${type.split('/')[0]} file`);
                    break;
                }
            }
            
            // Determine severity based on risk score
            if (analysis.riskScore >= 8) {
                analysis.severity = 'CRITICAL';
            } else if (analysis.riskScore >= 5) {
                analysis.severity = 'HIGH';
            } else if (analysis.riskScore >= 3) {
                analysis.severity = 'MEDIUM';
            } else {
                analysis.severity = 'LOW';
            }
            
            // Update suspicious flag based on risk score (raised threshold)
            if (analysis.riskScore >= 6) {
                analysis.suspicious = true;
            } else {
                analysis.suspicious = false;  // Override worker's decision with our scoring
            }
        }
        
        // Generate security report
        const securityReport = steganographyDetector.generateSecurityReport(analysis);
        
        // Log the analysis
        await AuditLog.create({
            action: analysis.suspicious ? 'FILE_REJECTED' : 'FILE_APPROVED',
            userId,
            username: username || 'anonymous',
            ipAddress,
            userAgent: req.headers['user-agent'],
            roomPin: roomPin || 'general',
            details: {
                filename: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                analysis: analysis,
                securityReport,
                suspicious: analysis.suspicious
            }
        });
        
        // If file is suspicious, quarantine it and reject upload
        if (analysis.suspicious) {
            console.log(`[SECURITY] File rejected: ${req.file.originalname} - Risk Score: ${analysis.riskScore}`);
            
            // Quarantine the file
            await quarantineService.quarantineFile(tempFilePath, analysis, {
                userId,
                username: username || 'anonymous',
                ipAddress,
                roomPin: roomPin || 'general',
                originalName: req.file.originalname,
                fileType: req.file.mimetype
            });
            
            // Delete temporary file
            await safeDeleteFile(tempFilePath);
            
            return res.status(403).json({
                error: 'File rejected: Security analysis failed',
                severity: analysis.severity,
                riskScore: analysis.riskScore,
                details: {
                    riskFactors: analysis.riskFactors,
                    recommendation: securityReport.recommendation,
                    entropy: analysis.entropy,
                    fileHash: analysis.fileHash
                }
            });
        }
        
        // File passed security checks, upload to Cloudinary
        console.log(`[SECURITY] File approved: ${req.file.originalname}`);
        
        // Determinar el resource_type correcto para Cloudinary
        let resourceType = 'auto';
        const mimeType = req.file.mimetype;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        
        // Cloudinary maneja WebM como 'video' incluso para audio
        if (mimeType === 'audio/webm' || mimeType === 'video/webm' || fileExtension === '.webm') {
            resourceType = 'video';
            console.log(`[CLOUDINARY] Usando resource_type 'video' para WebM`);
        } else if (mimeType.startsWith('audio/')) {
            resourceType = 'video'; // Cloudinary usa 'video' para todos los medios de audio/video
            console.log(`[CLOUDINARY] Usando resource_type 'video' para audio`);
        } else if (mimeType.startsWith('video/')) {
            resourceType = 'video';
            console.log(`[CLOUDINARY] Usando resource_type 'video' para video`);
        } else if (mimeType.startsWith('image/')) {
            resourceType = 'image';
            console.log(`[CLOUDINARY] Usando resource_type 'image' para imagen`);
        } else {
            resourceType = 'raw'; // Para documentos y otros archivos
            console.log(`[CLOUDINARY] Usando resource_type 'raw' para documento`);
        }
        
        // Configuración de upload para Cloudinary con opciones adicionales
        const uploadOptions = {
            folder: 'chat-images',
            resource_type: resourceType,
            format: fileExtension.replace('.', '') || undefined, // Especificar formato explícitamente
        };
        
        // Para archivos de audio/video, agregar configuraciones adicionales
        if (resourceType === 'video') {
            uploadOptions.audio_codec = 'opus'; // Para WebM con Opus
            uploadOptions.video_codec = 'none'; // Sin video, solo audio
        }
        
        console.log(`[CLOUDINARY] Opciones de upload:`, JSON.stringify(uploadOptions));
        
        let uploadResult;
        try {
            uploadResult = await cloudinary.uploader.upload(tempFilePath, uploadOptions);
            console.log(`[CLOUDINARY] ✅ Upload exitoso: ${uploadResult.secure_url}`);
        } catch (cloudinaryError) {
            // Si falla con las opciones específicas, intentar con opciones básicas
            console.warn(`[CLOUDINARY] ⚠️ Primer intento falló, intentando con opciones básicas...`);
            console.warn(`[CLOUDINARY] Error:`, cloudinaryError.message);
            
            try {
                // Intento con opciones mínimas
                uploadResult = await cloudinary.uploader.upload(tempFilePath, {
                    folder: 'chat-images',
                    resource_type: 'raw' // Como último recurso, subir como archivo raw
                });
                console.log(`[CLOUDINARY] ✅ Upload exitoso como 'raw': ${uploadResult.secure_url}`);
            } catch (fallbackError) {
                console.error(`[CLOUDINARY] ❌ Todos los intentos fallaron`);
                throw cloudinaryError; // Lanzar el error original
            }
        }
        
        // Delete temporary file
        await safeDeleteFile(tempFilePath);
        
        res.json({
            success: true,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            securityCheck: {
                passed: true,
                riskScore: analysis.riskScore || 0,
                entropy: analysis.entropy,
                fileHash: analysis.fileHash,
                timestamp: new Date()
            }
        });
        
    } catch (error) {
        console.error('[ERROR] Error uploading file:', error);
        
        // Clean up temporary file
        if (tempFilePath) {
            try {
                await safeDeleteFile(tempFilePath);
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
            await safeDeleteFile(tempFilePath);
            return res.status(403).json({
                error: 'Image rejected due to security concerns'
            });
        }
        
        // Upload to Cloudinary
        // Determinar el resource_type correcto
        let resourceType = 'image';
        if (req.file.mimetype.startsWith('audio/') || req.file.mimetype.startsWith('video/')) {
            resourceType = 'video';
        } else if (!req.file.mimetype.startsWith('image/')) {
            resourceType = 'raw';
        }
        
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'chat-images',
            resource_type: resourceType
        });
        
        await safeDeleteFile(tempFilePath);
        
        res.json({ imageUrl: uploadResult.secure_url });
        
    } catch (error) {
        console.error('Error uploading image:', error);
        
        if (tempFilePath) {
            try {
                await safeDeleteFile(tempFilePath);
            } catch (unlinkError) {
                console.error('Error deleting temp file:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Error uploading image' });
    }
});

module.exports = router;
