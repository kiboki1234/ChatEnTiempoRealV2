const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

class SteganographyDetector {
    constructor() {
        this.ENTROPY_THRESHOLD = 7.5; // High entropy suggests possible steganography
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        this.CHI_SQUARE_THRESHOLD = 50; // Chi-square threshold for LSB analysis
        this.SUSPICIOUS_PATTERNS = [
            // Common steganography tool signatures
            Buffer.from('OutGuess'),
            Buffer.from('StegHide'),
            Buffer.from('F5'),
            Buffer.from('JPHide'),
            Buffer.from('Camouflage'),
            Buffer.from('OpenStego'),
            Buffer.from('Steghide'),
            Buffer.from('SilentEye')
        ];
        // Known malicious file signatures
        this.MALICIOUS_SIGNATURES = [
            Buffer.from([0x4D, 0x5A]), // PE executable (MZ header)
            Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
            Buffer.from('<?php'), // PHP code
            Buffer.from('<script'), // Embedded scripts
            Buffer.from('eval('), // Eval functions
        ];
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

    // Calculate file hash for integrity verification
    calculateFileHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    // Check for malicious signatures in file
    checkMaliciousSignatures(buffer) {
        const findings = [];
        
        for (const signature of this.MALICIOUS_SIGNATURES) {
            if (buffer.includes(signature)) {
                findings.push({
                    type: 'MALICIOUS_SIGNATURE',
                    signature: signature.toString('utf-8', 0, Math.min(signature.length, 20)),
                    severity: 'CRITICAL'
                });
            }
        }
        
        // Check for suspicious strings
        const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
        const suspiciousPatterns = [
            /eval\s*\(/gi,
            /exec\s*\(/gi,
            /base64_decode/gi,
            /system\s*\(/gi,
            /shell_exec/gi,
            /<\?php/gi,
            /\$_GET\[/gi,
            /\$_POST\[/gi
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(bufferStr)) {
                findings.push({
                    type: 'SUSPICIOUS_CODE',
                    pattern: pattern.toString(),
                    severity: 'HIGH'
                });
            }
        }
        
        return findings;
    }

    // Check for steganography tool signatures
    checkSteganographySignatures(buffer) {
        const findings = [];
        
        for (const signature of this.SUSPICIOUS_PATTERNS) {
            if (buffer.includes(signature)) {
                findings.push({
                    type: 'STEGANOGRAPHY_TOOL',
                    tool: signature.toString(),
                    severity: 'HIGH'
                });
            }
        }
        
        return findings;
    }

    // Chi-square test for LSB steganography
    chiSquareTest(data) {
        const pairs = new Array(256).fill(0).map(() => [0, 0]);
        
        // Count LSB pairs
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const lsb = value & 1;
            pairs[value >> 1][lsb]++;
        }
        
        // Calculate chi-square statistic
        let chiSquare = 0;
        for (let i = 0; i < pairs.length; i++) {
            const expected = (pairs[i][0] + pairs[i][1]) / 2;
            if (expected > 0) {
                chiSquare += Math.pow(pairs[i][0] - expected, 2) / expected;
                chiSquare += Math.pow(pairs[i][1] - expected, 2) / expected;
            }
        }
        
        return {
            chiSquare: chiSquare.toFixed(2),
            suspicious: chiSquare > this.CHI_SQUARE_THRESHOLD,
            severity: chiSquare > this.CHI_SQUARE_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM'
        };
    }

    // Analyze image for steganography indicators
    async analyzeImage(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const buffer = await fs.readFile(filePath);
            
            // Check file size
            if (stats.size > this.MAX_FILE_SIZE) {
                return {
                    suspicious: true,
                    reason: 'File size exceeds limit',
                    severity: 'MEDIUM',
                    details: { fileSize: stats.size, maxSize: this.MAX_FILE_SIZE }
                };
            }
            
            // Calculate file hash for integrity
            const fileHash = this.calculateFileHash(buffer);
            
            // Check for malicious signatures
            const maliciousFindings = this.checkMaliciousSignatures(buffer);
            if (maliciousFindings.length > 0) {
                return {
                    suspicious: true,
                    severity: 'CRITICAL',
                    reason: 'Malicious content detected',
                    maliciousFindings,
                    fileHash
                };
            }
            
            // Check for steganography tool signatures
            const stegoFindings = this.checkSteganographySignatures(buffer);
            
            // Read image metadata
            const metadata = await sharp(filePath).metadata();
            
            // Read raw pixel data
            const { data, info } = await sharp(filePath)
                .raw()
                .toBuffer({ resolveWithObject: true });
            
            // Calculate entropy of pixel data
            const entropy = this.calculateEntropy(data);
            
            // Chi-square test for LSB steganography
            const chiSquareResult = this.chiSquareTest(data);
            
            // Check LSB (Least Significant Bit) anomalies
            const lsbAnalysis = this.analyzeLSB(data);
            
            // Check for suspicious metadata
            const metadataAnalysis = this.analyzeMetadata(metadata);
            
            // Check for hidden data in color channels
            const channelAnalysis = await this.analyzeColorChannels(filePath);
            
            // Check for anomalies in file structure
            const structureAnalysis = this.analyzeFileStructure(buffer, metadata.format);
            
            // Determine overall risk
            const riskFactors = [];
            let riskScore = 0;
            
            if (entropy > this.ENTROPY_THRESHOLD) {
                riskFactors.push('High entropy detected');
                riskScore += 3;
            }
            if (chiSquareResult.suspicious) {
                riskFactors.push('Chi-square test failed');
                riskScore += 3;
            }
            if (lsbAnalysis.suspicious) {
                riskFactors.push('Abnormal LSB distribution');
                riskScore += 2;
            }
            if (metadataAnalysis.suspicious) {
                riskFactors.push('Suspicious metadata');
                riskScore += 2;
            }
            if (channelAnalysis.suspicious) {
                riskFactors.push('High channel entropy');
                riskScore += 2;
            }
            if (structureAnalysis.suspicious) {
                riskFactors.push('File structure anomalies');
                riskScore += 3;
            }
            if (stegoFindings.length > 0) {
                riskFactors.push('Steganography tool signatures found');
                riskScore += 4;
            }
            
            const suspicious = riskScore >= 4; // Threshold for rejection
            const severity = riskScore >= 7 ? 'CRITICAL' : riskScore >= 4 ? 'HIGH' : 'MEDIUM';
            
            return {
                suspicious,
                severity,
                riskScore,
                riskFactors,
                entropy: entropy.toFixed(3),
                fileHash,
                chiSquareResult,
                lsbAnalysis,
                metadataAnalysis,
                channelAnalysis,
                structureAnalysis,
                stegoFindings,
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

    // Analyze file structure for anomalies
    analyzeFileStructure(buffer, format) {
        const anomalies = [];
        let suspicious = false;
        
        // Check for trailing data after image end
        const formatSignatures = {
            'jpeg': [Buffer.from([0xFF, 0xD9])], // JPEG end marker
            'png': [Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82])], // PNG end
            'gif': [Buffer.from([0x00, 0x3B])] // GIF trailer
        };
        
        if (formatSignatures[format]) {
            for (const endMarker of formatSignatures[format]) {
                const lastIndex = buffer.lastIndexOf(endMarker);
                if (lastIndex !== -1 && lastIndex < buffer.length - endMarker.length - 100) {
                    // Significant data after end marker
                    const trailingBytes = buffer.length - lastIndex - endMarker.length;
                    anomalies.push({
                        type: 'TRAILING_DATA',
                        bytes: trailingBytes,
                        description: `${trailingBytes} bytes found after ${format.toUpperCase()} end marker`
                    });
                    suspicious = true;
                }
            }
        }
        
        // Check for multiple file signatures (polyglot files)
        const signatures = [
            { name: 'JPEG', sig: [0xFF, 0xD8, 0xFF] },
            { name: 'PNG', sig: [0x89, 0x50, 0x4E, 0x47] },
            { name: 'GIF', sig: [0x47, 0x49, 0x46, 0x38] },
            { name: 'PDF', sig: [0x25, 0x50, 0x44, 0x46] },
            { name: 'ZIP', sig: [0x50, 0x4B, 0x03, 0x04] },
            { name: 'RAR', sig: [0x52, 0x61, 0x72, 0x21] }
        ];
        
        const foundSignatures = [];
        for (const { name, sig } of signatures) {
            let index = 0;
            let count = 0;
            while ((index = buffer.indexOf(Buffer.from(sig), index)) !== -1) {
                count++;
                index += sig.length;
                if (count > 1) break; // Only check for multiple occurrences
            }
            if (count > 0) {
                foundSignatures.push({ name, count });
            }
        }
        
        if (foundSignatures.length > 1 || foundSignatures.some(f => f.count > 1)) {
            anomalies.push({
                type: 'MULTIPLE_SIGNATURES',
                signatures: foundSignatures,
                description: 'Multiple file format signatures detected (possible polyglot)'
            });
            suspicious = true;
        }
        
        return {
            suspicious,
            anomalies,
            reason: suspicious ? 'File structure anomalies detected' : 'File structure appears normal'
        };
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
            ratio: ratio.toFixed(3),
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
                    severity: 'MEDIUM',
                    reason: 'File size exceeds limit'
                };
            }
            
            // Read file data
            const buffer = await fs.readFile(filePath);
            
            // Calculate file hash
            const fileHash = this.calculateFileHash(buffer);
            
            // Check for malicious signatures
            const maliciousFindings = this.checkMaliciousSignatures(buffer);
            if (maliciousFindings.length > 0) {
                return {
                    suspicious: true,
                    severity: 'CRITICAL',
                    reason: 'Malicious content detected',
                    maliciousFindings,
                    fileHash
                };
            }
            
            // Check for steganography tool signatures
            const stegoFindings = this.checkSteganographySignatures(buffer);
            
            // Calculate entropy
            const entropy = this.calculateEntropy(buffer);
            
            // Check for suspicious patterns
            const hasNullBytes = buffer.includes(0x00);
            const hasHighEntropy = entropy > this.ENTROPY_THRESHOLD;
            
            // Analyze file structure
            const ext = path.extname(filePath).toLowerCase();
            let structureAnalysis = { suspicious: false, anomalies: [] };
            
            if (ext === '.pdf') {
                structureAnalysis = this.analyzePDFStructure(buffer);
            }
            
            // Calculate risk score
            let riskScore = 0;
            const riskFactors = [];
            
            if (hasHighEntropy) {
                riskFactors.push('High entropy');
                riskScore += 3;
            }
            if (stegoFindings.length > 0) {
                riskFactors.push('Steganography signatures');
                riskScore += 4;
            }
            if (structureAnalysis.suspicious) {
                riskFactors.push('Structure anomalies');
                riskScore += 2;
            }
            
            const suspicious = riskScore >= 4;
            const severity = riskScore >= 7 ? 'CRITICAL' : riskScore >= 4 ? 'HIGH' : 'MEDIUM';
            
            return {
                suspicious,
                severity,
                riskScore,
                riskFactors,
                entropy: entropy.toFixed(3),
                fileSize: stats.size,
                fileHash,
                hasNullBytes,
                stegoFindings,
                structureAnalysis,
                reason: suspicious ? 'High entropy suggests possible hidden data' : 'File appears normal'
            };
        } catch (error) {
            console.error('Error analyzing file:', error);
            throw error;
        }
    }

    // Analyze PDF structure
    analyzePDFStructure(buffer) {
        const anomalies = [];
        let suspicious = false;
        
        const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
        
        // Check for JavaScript in PDF
        if (bufferStr.includes('/JavaScript') || bufferStr.includes('/JS')) {
            anomalies.push({
                type: 'EMBEDDED_JAVASCRIPT',
                description: 'PDF contains embedded JavaScript'
            });
            suspicious = true;
        }
        
        // Check for launch actions
        if (bufferStr.includes('/Launch') || bufferStr.includes('/Action')) {
            anomalies.push({
                type: 'LAUNCH_ACTION',
                description: 'PDF contains launch actions'
            });
            suspicious = true;
        }
        
        // Check for embedded files
        if (bufferStr.includes('/EmbeddedFile')) {
            anomalies.push({
                type: 'EMBEDDED_FILE',
                description: 'PDF contains embedded files'
            });
            suspicious = true;
        }
        
        return {
            suspicious,
            anomalies,
            reason: suspicious ? 'Suspicious PDF structure detected' : 'PDF structure appears normal'
        };
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
            
            // Add metadata
            result.timestamp = new Date();
            result.fileType = fileType;
            result.analyzedBy = 'SteganographyDetector v2.0';
            
            // Log analysis result
            await AuditLog.create({
                action: result.suspicious ? 'FILE_REJECTED' : 'FILE_APPROVED',
                userId,
                username,
                ipAddress,
                details: {
                    filePath,
                    fileType,
                    analysis: result,
                    riskScore: result.riskScore || 0,
                    severity: result.severity || 'LOW',
                    reason: result.suspicious ? result.riskFactors?.join(', ') : 'File passed security checks'
                }
            });
            
            return result;
        } catch (error) {
            console.error('Error in steganography detection:', error);
            
            // Log error
            await AuditLog.create({
                action: 'FILE_ANALYSIS_ERROR',
                userId,
                username,
                ipAddress,
                details: {
                    filePath,
                    fileType,
                    error: error.message,
                    stack: error.stack
                }
            });
            
            throw error;
        }
    }

    // Generate detailed security report
    generateSecurityReport(analysisResult) {
        const report = {
            summary: {
                status: analysisResult.suspicious ? 'REJECTED' : 'APPROVED',
                severity: analysisResult.severity || 'LOW',
                riskScore: analysisResult.riskScore || 0,
                timestamp: analysisResult.timestamp
            },
            fileInfo: analysisResult.fileInfo || {
                size: analysisResult.fileSize,
                hash: analysisResult.fileHash
            },
            securityChecks: {
                malwareCheck: {
                    passed: !analysisResult.maliciousFindings || analysisResult.maliciousFindings.length === 0,
                    findings: analysisResult.maliciousFindings || []
                },
                steganographyCheck: {
                    passed: !analysisResult.stegoFindings || analysisResult.stegoFindings.length === 0,
                    findings: analysisResult.stegoFindings || [],
                    entropy: analysisResult.entropy,
                    chiSquare: analysisResult.chiSquareResult
                },
                structureCheck: {
                    passed: !analysisResult.structureAnalysis?.suspicious,
                    anomalies: analysisResult.structureAnalysis?.anomalies || []
                },
                metadataCheck: {
                    passed: !analysisResult.metadataAnalysis?.suspicious,
                    details: analysisResult.metadataAnalysis
                }
            },
            riskFactors: analysisResult.riskFactors || [],
            recommendation: this.generateRecommendation(analysisResult)
        };
        
        return report;
    }

    // Generate recommendation based on analysis
    generateRecommendation(analysisResult) {
        if (!analysisResult.suspicious) {
            return 'File appears safe and can be uploaded.';
        }
        
        if (analysisResult.maliciousFindings && analysisResult.maliciousFindings.length > 0) {
            return 'CRITICAL: File contains malicious content and must be rejected immediately.';
        }
        
        if (analysisResult.riskScore >= 7) {
            return 'HIGH RISK: File shows multiple indicators of steganography or manipulation. Strongly recommend rejection.';
        }
        
        if (analysisResult.riskScore >= 4) {
            return 'MODERATE RISK: File shows suspicious patterns. Recommend manual review or rejection.';
        }
        
        return 'File shows minor anomalies but may be acceptable with caution.';
    }
}

module.exports = new SteganographyDetector();
