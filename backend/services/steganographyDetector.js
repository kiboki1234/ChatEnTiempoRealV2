const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class SteganographyDetector {
    constructor() {
        this.ENTROPY_THRESHOLD = 7.3; // Aumentado para reducir falsos positivos en PNG comprimidos
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        this.CHI_SQUARE_THRESHOLD = 30; // Más estricto (antes 50)
        this.LSB_RATIO_THRESHOLD = 0.60; // Ajustado para reducir falsos positivos
        
        // Firmas de herramientas de esteganografía expandidas
        this.SUSPICIOUS_PATTERNS = [
            Buffer.from('OutGuess'),
            Buffer.from('StegHide'),
            Buffer.from('Steghide'),
            Buffer.from('F5'),
            Buffer.from('JPHide'),
            Buffer.from('JPHideSeek'),
            Buffer.from('Camouflage'),
            Buffer.from('OpenStego'),
            Buffer.from('SilentEye'),
            Buffer.from('StegSecret'),
            Buffer.from('S-Tools'),
            Buffer.from('Invisible Secrets'),
            Buffer.from('StegFS'),
            Buffer.from('StegDetect'),
            Buffer.from('OpenPuff'),
            Buffer.from('DeepSound'),
            Buffer.from('Xiao Steganography'),
            // Firmas binarias comunes
            Buffer.from([0x53, 0x74, 0x65, 0x67]), // "Steg"
            Buffer.from([0x48, 0x49, 0x44, 0x45]), // "HIDE"
        ];
        
        // Firmas maliciosas expandidas
        this.MALICIOUS_SIGNATURES = [
            { sig: Buffer.from([0x4D, 0x5A]), name: 'PE executable (MZ header)', severity: 'CRITICAL' },
            { sig: Buffer.from([0x7F, 0x45, 0x4C, 0x46]), name: 'ELF executable', severity: 'CRITICAL' },
            { sig: Buffer.from('<?php'), name: 'PHP code', severity: 'CRITICAL' },
            { sig: Buffer.from('<script'), name: 'Embedded scripts', severity: 'HIGH' },
            { sig: Buffer.from('eval('), name: 'Eval functions', severity: 'HIGH' },
            { sig: Buffer.from('function('), name: 'Obfuscated functions', severity: 'MEDIUM' },
            { sig: Buffer.from('base64,'), name: 'Base64 data URI', severity: 'MEDIUM' },
            { sig: Buffer.from('powershell'), name: 'PowerShell commands', severity: 'CRITICAL' },
            { sig: Buffer.from('cmd.exe'), name: 'Windows command shell', severity: 'CRITICAL' },
            { sig: Buffer.from('/bin/sh'), name: 'Unix shell', severity: 'CRITICAL' },
            { sig: Buffer.from('/bin/bash'), name: 'Bash shell', severity: 'CRITICAL' },
            { sig: Buffer.from('chmod +x'), name: 'Execute permissions', severity: 'HIGH' },
            { sig: Buffer.from('wget'), name: 'Download command', severity: 'HIGH' },
            { sig: Buffer.from('curl'), name: 'Download command', severity: 'HIGH' },
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
        
        // Búsqueda más exhaustiva en todo el buffer
        for (const { sig, name, severity} of this.MALICIOUS_SIGNATURES) {
            let index = 0;
            const positions = [];
            
            while ((index = buffer.indexOf(sig, index)) !== -1) {
                positions.push(index);
                index += sig.length;
                if (positions.length > 5) break; // Limitar para performance
            }
            
            if (positions.length > 0) {
                findings.push({
                    type: 'MALICIOUS_SIGNATURE',
                    signature: name,
                    severity,
                    occurrences: positions.length,
                    positions: positions.slice(0, 3) // Primeras 3 posiciones
                });
            }
        }
        
        // Búsqueda de patrones sospechosos en strings
        const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
        const suspiciousPatterns = [
            { pattern: /eval\s*\(/gi, name: 'eval() function', severity: 'HIGH' },
            { pattern: /exec\s*\(/gi, name: 'exec() function', severity: 'HIGH' },
            { pattern: /base64_decode/gi, name: 'base64_decode()', severity: 'MEDIUM' },
            { pattern: /system\s*\(/gi, name: 'system() call', severity: 'CRITICAL' },
            { pattern: /shell_exec/gi, name: 'shell_exec()', severity: 'CRITICAL' },
            { pattern: /<\?php/gi, name: 'PHP opening tag', severity: 'CRITICAL' },
            { pattern: /\$_GET\[/gi, name: '$_GET variable', severity: 'HIGH' },
            { pattern: /\$_POST\[/gi, name: '$_POST variable', severity: 'HIGH' },
            { pattern: /document\.write/gi, name: 'document.write', severity: 'MEDIUM' },
            { pattern: /innerHTML\s*=/gi, name: 'innerHTML assignment', severity: 'MEDIUM' },
            { pattern: /atob\(/gi, name: 'atob() (base64 decode)', severity: 'MEDIUM' },
            { pattern: /fromCharCode/gi, name: 'String.fromCharCode', severity: 'MEDIUM' },
            { pattern: /unescape\(/gi, name: 'unescape()', severity: 'HIGH' },
            { pattern: /\\x[0-9a-f]{2}/gi, name: 'Hex escape sequences', severity: 'LOW' },
        ];
        
        for (const { pattern, name, severity } of suspiciousPatterns) {
            const matches = bufferStr.match(pattern);
            if (matches && matches.length > 0) {
                findings.push({
                    type: 'SUSPICIOUS_CODE',
                    pattern: name,
                    severity,
                    occurrences: matches.length
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

    // Chi-square test for LSB steganography - MEJORADO
    chiSquareTest(data) {
        const pairs = new Array(256).fill(0).map(() => [0, 0]);
        
        // Contar pares de LSB (análisis más profundo)
        const sampleSize = Math.min(data.length, 50000);
        for (let i = 0; i < sampleSize; i++) {
            const value = data[i];
            const lsb = value & 1;
            pairs[value >> 1][lsb]++;
        }
        
        // Calcular estadística chi-cuadrado
        let chiSquare = 0;
        let validPairs = 0;
        
        for (let i = 0; i < pairs.length; i++) {
            const expected = (pairs[i][0] + pairs[i][1]) / 2;
            if (expected > 0) {
                chiSquare += Math.pow(pairs[i][0] - expected, 2) / expected;
                chiSquare += Math.pow(pairs[i][1] - expected, 2) / expected;
                validPairs++;
            }
        }
        
        // Normalizar por número de pares válidos
        const normalizedChiSquare = validPairs > 0 ? chiSquare / validPairs : 0;
        
        // Grados de libertad y umbral ajustado
        const degreesOfFreedom = validPairs;
        const criticalValue = this.CHI_SQUARE_THRESHOLD;
        
        return {
            chiSquare: chiSquare.toFixed(2),
            normalizedChiSquare: normalizedChiSquare.toFixed(4),
            degreesOfFreedom,
            criticalValue,
            suspicious: normalizedChiSquare > 3.0, // Ajustado: 3.0 es el umbral correcto
            severity: normalizedChiSquare > 5.0 ? 'HIGH' : normalizedChiSquare > 3.0 ? 'MEDIUM' : 'LOW',
            confidence: normalizedChiSquare > 0.5 ? 'High confidence LSB steganography detected' :
                       normalizedChiSquare > 0.3 ? 'Moderate confidence of LSB manipulation' :
                       'No significant LSB manipulation detected'
        };
    }
    
    // NUEVO: Detectar patrones de texto oculto
    detectHiddenText(buffer) {
        const findings = [];
        
        // Buscar patrones de texto codificado
        const textPatterns = [
            { pattern: /[A-Za-z0-9+/]{40,}={0,2}/g, name: 'Base64-like sequence', minLength: 100 },
            { pattern: /[0-9a-fA-F]{32,}/g, name: 'Hexadecimal sequence', minLength: 64 },
            { pattern: /(BEGIN|END) (RSA|PGP|CERTIFICATE)/g, name: 'Cryptographic key/certificate' },
            { pattern: /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, name: 'PEM format key' },
        ];
        
        const bufferStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000));
        
        for (const { pattern, name, minLength } of textPatterns) {
            const matches = bufferStr.match(pattern);
            if (matches) {
                const suspiciousMatches = matches.filter(m => !minLength || m.length >= minLength);
                if (suspiciousMatches.length > 0) {
                    findings.push({
                        type: 'HIDDEN_TEXT_PATTERN',
                        pattern: name,
                        occurrences: suspiciousMatches.length,
                        maxLength: Math.max(...suspiciousMatches.map(m => m.length)),
                        severity: 'MEDIUM'
                    });
                }
            }
        }
        
        return findings;
    }
    
    // NUEVO: Análisis de frecuencia de bytes
    analyzeByteFrequency(data) {
        const frequency = new Array(256).fill(0);
        const sampleSize = Math.min(data.length, 50000);
        
        for (let i = 0; i < sampleSize; i++) {
            frequency[data[i]]++;
        }
        
        // Calcular desviación estándar
        const mean = sampleSize / 256;
        let variance = 0;
        for (let i = 0; i < 256; i++) {
            variance += Math.pow(frequency[i] - mean, 2);
        }
        variance /= 256;
        const stdDev = Math.sqrt(variance);
        
        // En imágenes naturales, la distribución debe ser relativamente uniforme
        // Una desviación muy baja sugiere datos aleatorios/cifrados
        const coefficient = stdDev / mean;
        
        // Detectar bytes que nunca aparecen (sospechoso en imágenes grandes)
        const zeroFreqBytes = frequency.filter(f => f === 0).length;
        const unusualDistribution = coefficient < 0.3 || zeroFreqBytes > 200;
        
        return {
            suspicious: unusualDistribution,
            coefficient: coefficient.toFixed(3),
            stdDev: stdDev.toFixed(2),
            mean: mean.toFixed(2),
            zeroFrequencyBytes: zeroFreqBytes,
            reason: unusualDistribution 
                ? 'Unusual byte frequency distribution suggests encryption or random data'
                : 'Byte frequency distribution appears natural'
        };
    }
    
    // NUEVO: Detectar datos después del final del archivo
    detectTrailingData(buffer, format) {
        const findings = [];
        
        const formatMarkers = {
            'jpeg': { end: Buffer.from([0xFF, 0xD9]), name: 'JPEG EOI' },
            'png': { end: Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]), name: 'PNG IEND' },
            'gif': { end: Buffer.from([0x00, 0x3B]), name: 'GIF trailer' }
        };
        
        if (formatMarkers[format]) {
            const { end, name } = formatMarkers[format];
            const lastIndex = buffer.lastIndexOf(end);
            
            if (lastIndex !== -1) {
                const trailingBytes = buffer.length - lastIndex - end.length;
                
                // Tolerancia de 100 bytes para metadatos normales
                if (trailingBytes > 100) {
                    const trailingData = buffer.slice(lastIndex + end.length);
                    const trailingEntropy = this.calculateEntropy(trailingData);
                    
                    findings.push({
                        type: 'TRAILING_DATA',
                        bytes: trailingBytes,
                        entropy: trailingEntropy.toFixed(3),
                        description: `${trailingBytes} bytes found after ${name} marker`,
                        severity: trailingBytes > 10000 ? 'HIGH' : 'MEDIUM',
                        suspicious: trailingEntropy > 7.0 || trailingBytes > 5000
                    });
                }
            }
        }
        
        return findings;
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
            
            // Chi-square test for LSB steganography (MEJORADO)
            const chiSquareResult = this.chiSquareTest(data);
            
            // Check LSB (Least Significant Bit) anomalies (MEJORADO)
            const lsbAnalysis = this.analyzeLSB(data);
            
            // Check for suspicious metadata
            const metadataAnalysis = this.analyzeMetadata(metadata);
            
            // Check for hidden data in color channels
            const channelAnalysis = await this.analyzeColorChannels(filePath);
            
            // Check for anomalies in file structure
            const structureAnalysis = this.analyzeFileStructure(buffer, metadata.format);
            
            // NUEVO: Detectar texto oculto
            const hiddenTextFindings = this.detectHiddenText(buffer);
            
            // NUEVO: Análisis de frecuencia de bytes
            const frequencyAnalysis = this.analyzeByteFrequency(data);
            
            // NUEVO: Detectar datos después del final del archivo
            const trailingDataFindings = this.detectTrailingData(buffer, metadata.format);
            
            // Determine overall risk
            const riskFactors = [];
            let riskScore = 0;
            
            if (entropy > this.ENTROPY_THRESHOLD) {
                riskFactors.push(`High entropy detected: ${entropy.toFixed(3)}`);
                riskScore += 2; // Reducido de 3 a 2 - entropía sola no es suficiente
            }
            if (chiSquareResult.suspicious) {
                riskFactors.push(`Chi-square test failed: ${chiSquareResult.confidence}`);
                riskScore += chiSquareResult.severity === 'HIGH' ? 4 : 3;
            }
            if (lsbAnalysis.suspicious) {
                riskFactors.push(`LSB anomalies: ${lsbAnalysis.reason}`);
                riskScore += lsbAnalysis.periodicScore > 0.75 ? 4 : 2;
            }
            if (metadataAnalysis.suspicious) {
                riskFactors.push(`Suspicious metadata: ${metadataAnalysis.findings.join(', ')}`);
                riskScore += 2;
            }
            if (channelAnalysis.suspicious) {
                riskFactors.push('High channel entropy detected');
                riskScore += 2;
            }
            if (structureAnalysis.suspicious) {
                riskFactors.push(`File structure anomalies: ${structureAnalysis.findings.join(', ')}`);
                riskScore += 3;
            }
            if (stegoFindings.length > 0) {
                riskFactors.push(`Steganography signatures: ${stegoFindings.map(f => f.tool).join(', ')}`);
                riskScore += 4;
            }
            if (hiddenTextFindings.length > 0) {
                riskFactors.push(`Hidden text patterns: ${hiddenTextFindings.map(f => f.pattern).join(', ')}`);
                riskScore += 3;
            }
            if (frequencyAnalysis.suspicious) {
                riskFactors.push(`Unusual byte distribution: ${frequencyAnalysis.reason}`);
                riskScore += 2;
            }
            if (trailingDataFindings.length > 0) {
                const trailing = trailingDataFindings[0];
                riskFactors.push(`${trailing.bytes} trailing bytes with entropy ${trailing.entropy}`);
                riskScore += trailing.severity === 'HIGH' ? 3 : 2;
            }
            
            // Umbral ajustado: 4 puntos (antes 3) - requiere más evidencia
            const suspicious = riskScore >= 4;
            const severity = riskScore >= 8 ? 'CRITICAL' : riskScore >= 5 ? 'HIGH' : riskScore >= 4 ? 'MEDIUM' : 'LOW';
            
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
                hiddenTextFindings,
                frequencyAnalysis,
                trailingDataFindings,
                fileInfo: {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    channels: metadata.channels,
                    size: stats.size
                }
            };
        } catch (error) {
            logger.error('Error analyzing image', { error: error.message });
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

    // Analyze LSB (Least Significant Bit) patterns - MEJORADO
    analyzeLSB(data) {
        const lsbCount = { 0: 0, 1: 0 };
        const lsbSequences = [];
        let currentSequence = [];
        let lastLSB = -1;
        
        // Analizar distribución de LSB
        for (let i = 0; i < Math.min(data.length, 100000); i++) {
            const lsb = data[i] & 1;
            lsbCount[lsb]++;
            
            // Detectar secuencias sospechosas
            if (lsb === lastLSB) {
                currentSequence.push(i);
            } else {
                if (currentSequence.length > 20) {
                    lsbSequences.push({
                        value: lastLSB,
                        length: currentSequence.length,
                        startIndex: currentSequence[0]
                    });
                }
                currentSequence = [i];
                lastLSB = lsb;
            }
        }
        
        // En imágenes naturales, LSB debe estar cerca de 50/50
        const total = lsbCount[0] + lsbCount[1];
        const ratio = Math.abs(lsbCount[0] - lsbCount[1]) / total;
        const expectedRatio = 0.5;
        const deviation = Math.abs(ratio - expectedRatio);
        
        // Detectar patrones periódicos (común en LSB steganography)
        let periodicScore = 0;
        if (lsbSequences.length > 5) {
            periodicScore = lsbSequences.length / 10;
        }
        
        const suspicious = ratio > this.LSB_RATIO_THRESHOLD || periodicScore > 2;
        
        return {
            suspicious,
            ratio: ratio.toFixed(3),
            deviation: deviation.toFixed(3),
            distribution: lsbCount,
            periodicSequences: lsbSequences.length,
            periodicScore: periodicScore.toFixed(2),
            reason: suspicious 
                ? `Abnormal LSB distribution detected (ratio: ${ratio.toFixed(3)}, expected: 0.500)`
                : 'LSB distribution appears normal'
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
            logger.error('Error analyzing file', { error: error.message });
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
            logger.error('Error in steganography detection', { filePath, error: error.message });
            
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
