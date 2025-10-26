const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const AuditLog = require('../models/AuditLog');

class SteganographyDetector {
    constructor() {
        this.ENTROPY_THRESHOLD = 7.5; // High entropy suggests possible steganography
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    }

    // Calculate Shannon entropy of data
    calculateEntropy(data) {
        const frequency = {};
        let entropy = 0;
        
        // Calculate frequency of each byte
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            frequency[byte] = (frequency[byte] || 0) + 1;
        }
        
        // Calculate entropy
        for (const byte in frequency) {
            const probability = frequency[byte] / data.length;
            entropy -= probability * Math.log2(probability);
        }
        
        return entropy;
    }

    // Analyze image for steganography indicators
    async analyzeImage(filePath) {
        try {
            const stats = await fs.stat(filePath);
            
            // Check file size
            if (stats.size > this.MAX_FILE_SIZE) {
                return {
                    suspicious: true,
                    reason: 'File size exceeds limit',
                    details: { fileSize: stats.size, maxSize: this.MAX_FILE_SIZE }
                };
            }
            
            // Read image metadata
            const metadata = await sharp(filePath).metadata();
            
            // Read raw pixel data
            const { data, info } = await sharp(filePath)
                .raw()
                .toBuffer({ resolveWithObject: true });
            
            // Calculate entropy of pixel data
            const entropy = this.calculateEntropy(data);
            
            // Check LSB (Least Significant Bit) anomalies
            const lsbAnalysis = this.analyzeLSB(data);
            
            // Check for suspicious metadata
            const metadataAnalysis = this.analyzeMetadata(metadata);
            
            // Check for hidden data in color channels
            const channelAnalysis = await this.analyzeColorChannels(filePath);
            
            const suspicious = 
                entropy > this.ENTROPY_THRESHOLD ||
                lsbAnalysis.suspicious ||
                metadataAnalysis.suspicious ||
                channelAnalysis.suspicious;
            
            return {
                suspicious,
                entropy,
                lsbAnalysis,
                metadataAnalysis,
                channelAnalysis,
                fileInfo: {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    channels: metadata.channels,
                    size: stats.size
                }
            };
        } catch (error) {
            console.error('Error analyzing image:', error);
            throw error;
        }
    }

    // Analyze LSB (Least Significant Bit) patterns
    analyzeLSB(data) {
        const lsbCount = { 0: 0, 1: 0 };
        let anomalies = 0;
        
        // Sample every 100th pixel to improve performance
        for (let i = 0; i < data.length; i += 100) {
            const lsb = data[i] & 1;
            lsbCount[lsb]++;
        }
        
        // In natural images, LSB should be roughly 50/50
        const total = lsbCount[0] + lsbCount[1];
        const ratio = Math.abs(lsbCount[0] - lsbCount[1]) / total;
        
        // If ratio is too skewed, it might indicate steganography
        const suspicious = ratio > 0.6;
        
        return {
            suspicious,
            ratio,
            distribution: lsbCount,
            reason: suspicious ? 'Abnormal LSB distribution detected' : 'LSB distribution appears normal'
        };
    }

    // Analyze metadata for suspicious patterns
    analyzeMetadata(metadata) {
        const suspicious = 
            metadata.density > 1000 || // Unusually high density
            (metadata.exif && Object.keys(metadata.exif).length > 50) || // Too many EXIF tags
            (metadata.icc && metadata.icc.length > 100000); // Large ICC profile
        
        return {
            suspicious,
            reason: suspicious ? 'Unusual metadata patterns detected' : 'Metadata appears normal',
            details: {
                hasExif: !!metadata.exif,
                hasIcc: !!metadata.icc,
                density: metadata.density
            }
        };
    }

    // Analyze color channels for anomalies
    async analyzeColorChannels(filePath) {
        try {
            const { data: red } = await sharp(filePath)
                .extractChannel('red')
                .raw()
                .toBuffer({ resolveWithObject: true });
            
            const { data: green } = await sharp(filePath)
                .extractChannel('green')
                .raw()
                .toBuffer({ resolveWithObject: true });
            
            const { data: blue } = await sharp(filePath)
                .extractChannel('blue')
                .raw()
                .toBuffer({ resolveWithObject: true });
            
            const redEntropy = this.calculateEntropy(red);
            const greenEntropy = this.calculateEntropy(green);
            const blueEntropy = this.calculateEntropy(blue);
            
            // Check if any channel has unusually high entropy
            const maxEntropy = Math.max(redEntropy, greenEntropy, blueEntropy);
            const suspicious = maxEntropy > this.ENTROPY_THRESHOLD;
            
            return {
                suspicious,
                channelEntropy: {
                    red: redEntropy.toFixed(3),
                    green: greenEntropy.toFixed(3),
                    blue: blueEntropy.toFixed(3)
                },
                maxEntropy: maxEntropy.toFixed(3),
                reason: suspicious ? 'High entropy in color channels' : 'Channel entropy appears normal'
            };
        } catch (error) {
            return {
                suspicious: false,
                reason: 'Could not analyze color channels',
                error: error.message
            };
        }
    }

    // Analyze non-image files (PDFs, documents)
    async analyzeFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            
            // Check file size
            if (stats.size > this.MAX_FILE_SIZE) {
                return {
                    suspicious: true,
                    reason: 'File size exceeds limit'
                };
            }
            
            // Read file data
            const buffer = await fs.readFile(filePath);
            
            // Calculate entropy
            const entropy = this.calculateEntropy(buffer);
            
            // Check for suspicious patterns
            const hasNullBytes = buffer.includes(0x00);
            const hasHighEntropy = entropy > this.ENTROPY_THRESHOLD;
            
            return {
                suspicious: hasHighEntropy,
                entropy: entropy.toFixed(3),
                fileSize: stats.size,
                hasNullBytes,
                reason: hasHighEntropy ? 'High entropy suggests possible hidden data' : 'File appears normal'
            };
        } catch (error) {
            console.error('Error analyzing file:', error);
            throw error;
        }
    }

    // Main analysis function
    async analyze(filePath, fileType, userId, username, ipAddress) {
        try {
            let result;
            
            if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType)) {
                result = await this.analyzeImage(filePath);
            } else {
                result = await this.analyzeFile(filePath);
            }
            
            // Log analysis result
            if (result.suspicious) {
                await AuditLog.create({
                    action: 'FILE_REJECTED',
                    userId,
                    username,
                    ipAddress,
                    details: {
                        filePath,
                        fileType,
                        analysis: result,
                        reason: 'Steganography detection'
                    }
                });
            }
            
            return result;
        } catch (error) {
            console.error('Error in steganography detection:', error);
            throw error;
        }
    }
}

module.exports = new SteganographyDetector();
