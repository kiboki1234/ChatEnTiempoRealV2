const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class SteganographyDetector {
    constructor() {
        this.ENTROPY_THRESHOLD = 7.4; // Umbral más sensible para imágenes
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        this.CHI_SQUARE_THRESHOLD = 40; // Umbral más estricto para chi-square
        this.LSB_CORRELATION_THRESHOLD = 0.05; // Umbral para correlación LSB
        this.PATTERN_THRESHOLD = 0.3; // Umbral para patrones repetitivos
        
        this.SUSPICIOUS_PATTERNS = [
            // Common steganography tool signatures
            Buffer.from('OutGuess'),
            Buffer.from('StegHide'),
            Buffer.from('F5'),
            Buffer.from('JPHide'),
            Buffer.from('Camouflage'),
            Buffer.from('OpenStego'),
            Buffer.from('Steghide'),
            Buffer.from('SilentEye'),
            Buffer.from('OpenPuff'),
            Buffer.from('S-Tools'),
            Buffer.from('Invisible Secrets'),
            Buffer.from('DeepSound'),
            Buffer.from('snow'),
            Buffer.from('wbStego')
        ];
        
        // Known malicious file signatures
        this.MALICIOUS_SIGNATURES = [
            Buffer.from([0x4D, 0x5A]), // PE executable (MZ header)
            Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
            Buffer.from('<?php'), // PHP code
            Buffer.from('<script'), // Embedded scripts
            Buffer.from('eval('), // Eval functions
            Buffer.from('exec('), // Exec functions
            Buffer.from('system('), // System calls
            Buffer.from('passthru('), // Passthru
            Buffer.from('shell_exec'), // Shell execution
            Buffer.from('base64_decode'), // Base64 decoding (común en payloads)
            Buffer.from('gzinflate'), // Compresión (común en ofuscación)
        ];
        
        // Strings sospechosos en código embebido
        this.SUSPICIOUS_CODE_PATTERNS = [
            /eval\s*\(/gi,
            /exec\s*\(/gi,
            /system\s*\(/gi,
            /shell_exec/gi,
            /passthru/gi,
            /base64_decode/gi,
            /gzinflate/gi,
            /str_rot13/gi,
            /\$_GET\[/gi,
            /\$_POST\[/gi,
            /\$_REQUEST\[/gi,
            /\$_SERVER\[/gi,
            /<\?php/gi,
            /<script[^>]*>.*?<\/script>/gis,
            /javascript:/gi,
            /onerror\s*=/gi,
            /onload\s*=/gi,
            /document\.write/gi,
            /window\.location/gi,
            /\.innerHTML/gi
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
        
        // Buscar firmas de malware conocidas
        for (const signature of this.MALICIOUS_SIGNATURES) {
            let index = 0;
            let count = 0;
            const positions = [];
            
            while ((index = buffer.indexOf(signature, index)) !== -1) {
                count++;
                positions.push(index);
                index += signature.length;
                if (count > 5) break; // Limitar búsqueda
            }
            
            if (count > 0) {
                findings.push({
                    type: 'MALICIOUS_SIGNATURE',
                    signature: signature.toString('utf-8', 0, Math.min(signature.length, 20)),
                    count,
                    positions: positions.slice(0, 3), // Primeras 3 posiciones
                    severity: 'CRITICAL'
                });
            }
        }
        
        // Buscar código sospechoso en múltiples encodings
        const encodings = ['utf-8', 'latin1', 'ascii'];
        const maxScanSize = Math.min(buffer.length, 50000); // Escanear más datos
        
        for (const encoding of encodings) {
            try {
                const bufferStr = buffer.toString(encoding, 0, maxScanSize);
                
                for (const pattern of this.SUSPICIOUS_CODE_PATTERNS) {
                    const matches = bufferStr.match(pattern);
                    if (matches && matches.length > 0) {
                        findings.push({
                            type: 'SUSPICIOUS_CODE',
                            pattern: pattern.toString(),
                            encoding,
                            matchCount: matches.length,
                            samples: matches.slice(0, 2), // Primeros 2 matches
                            severity: 'HIGH'
                        });
                    }
                }
            } catch (e) {
                // Ignorar errores de encoding
            }
        }
        
        // Buscar URLs sospechosas embebidas
        try {
            const bufferStr = buffer.toString('utf-8', 0, maxScanSize);
            const urlPattern = /https?:\/\/[^\s"'<>]+/gi;
            const urls = bufferStr.match(urlPattern);
            
            if (urls && urls.length > 10) { // Muchas URLs es sospechoso
                findings.push({
                    type: 'SUSPICIOUS_URLS',
                    count: urls.length,
                    samples: urls.slice(0, 3),
                    severity: 'MEDIUM'
                });
            }
        } catch (e) {
            // Ignorar errores
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

    // Chi-square test mejorado para LSB steganography
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
        const normalizedChi = validPairs > 0 ? chiSquare / validPairs : 0;
        
        return {
            chiSquare: chiSquare.toFixed(2),
            normalizedChi: normalizedChi.toFixed(4),
            validPairs,
            suspicious: chiSquare > this.CHI_SQUARE_THRESHOLD,
            severity: chiSquare > this.CHI_SQUARE_THRESHOLD * 2 ? 'HIGH' : 
                     chiSquare > this.CHI_SQUARE_THRESHOLD ? 'MEDIUM' : 'LOW'
        };
    }
    
    // Análisis de correlación entre bits LSB
    analyzeLSBCorrelation(data) {
        const sampleSize = Math.min(data.length, 100000);
        const step = Math.floor(data.length / sampleSize);
        
        let correlation = 0;
        let count = 0;
        
        for (let i = 0; i < data.length - step; i += step) {
            const lsb1 = data[i] & 1;
            const lsb2 = data[i + step] & 1;
            
            // Calcular correlación entre bits consecutivos
            if (lsb1 === lsb2) {
                correlation++;
            }
            count++;
        }
        
        const correlationRatio = count > 0 ? correlation / count : 0;
        
        // En datos naturales, la correlación debe estar cerca de 0.5
        // Desviación significativa indica posible esteganografía
        const deviation = Math.abs(correlationRatio - 0.5);
        const suspicious = deviation < this.LSB_CORRELATION_THRESHOLD;
        
        return {
            correlationRatio: correlationRatio.toFixed(4),
            deviation: deviation.toFixed(4),
            suspicious,
            reason: suspicious ? 'LSB bits show unnatural correlation' : 'LSB correlation is normal'
        };
    }
    
    // Análisis de patrones repetitivos (indicador de datos embebidos)
    analyzePatternRepetition(data) {
        const patternLength = 16; // Buscar patrones de 16 bytes
        const patterns = new Map();
        const sampleSize = Math.min(data.length, 50000);
        
        for (let i = 0; i < sampleSize - patternLength; i += patternLength) {
            const pattern = data.slice(i, i + patternLength).toString('hex');
            patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
        }
        
        // Encontrar el patrón más repetido
        let maxRepetitions = 0;
        let mostRepeatedPattern = null;
        
        for (const [pattern, count] of patterns.entries()) {
            if (count > maxRepetitions) {
                maxRepetitions = count;
                mostRepeatedPattern = pattern;
            }
        }
        
        const totalPatterns = patterns.size;
        const repetitionRatio = totalPatterns > 0 ? maxRepetitions / totalPatterns : 0;
        const suspicious = repetitionRatio > this.PATTERN_THRESHOLD;
        
        return {
            maxRepetitions,
            totalPatterns,
            repetitionRatio: repetitionRatio.toFixed(4),
            suspicious,
            reason: suspicious ? 'Unusual pattern repetition detected' : 'Pattern distribution is normal'
        };
    }
    
    // Análisis de histograma para detectar distribuciones anormales
    analyzeHistogram(data) {
        const histogram = new Array(256).fill(0);
        
        // Construir histograma
        for (let i = 0; i < data.length; i++) {
            histogram[data[i]]++;
        }
        
        // Calcular estadísticas del histograma
        const total = data.length;
        const expectedFreq = total / 256;
        
        let chiSquare = 0;
        let emptyBins = 0;
        
        for (let i = 0; i < 256; i++) {
            if (histogram[i] === 0) {
                emptyBins++;
            } else {
                chiSquare += Math.pow(histogram[i] - expectedFreq, 2) / expectedFreq;
            }
        }
        
        // Detectar "gaps" sospechosos en el histograma
        let maxGap = 0;
        let currentGap = 0;
        for (let i = 0; i < 256; i++) {
            if (histogram[i] === 0) {
                currentGap++;
            } else {
                if (currentGap > maxGap) maxGap = currentGap;
                currentGap = 0;
            }
        }
        
        // Histograma anormal si tiene muchos bins vacíos o gaps grandes
        const suspicious = emptyBins > 100 || maxGap > 20 || chiSquare > 10000;
        
        return {
            suspicious,
            emptyBins,
            maxGap,
            chiSquare: chiSquare.toFixed(2),
            reason: suspicious ? 'Abnormal histogram distribution' : 'Histogram distribution is normal'
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
            
            // Análisis de correlación LSB
            const lsbCorrelation = this.analyzeLSBCorrelation(data);
            
            // Análisis de patrones repetitivos
            const patternAnalysis = this.analyzePatternRepetition(buffer);
            
            // Check for suspicious metadata
            const metadataAnalysis = this.analyzeMetadata(metadata);
            
            // Check for hidden data in color channels
            const channelAnalysis = await this.analyzeColorChannels(filePath);
            
            // Check for anomalies in file structure
            const structureAnalysis = this.analyzeFileStructure(buffer, metadata.format);
            
            // Análisis de histograma de valores
            const histogramAnalysis = this.analyzeHistogram(data);
            
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
                riskFactors.push(`Abnormal LSB distribution (${lsbAnalysis.upperPlanesAnomalies} upper plane anomalies)`);
                riskScore += 3; // Incrementado
            }
            if (lsbCorrelation.suspicious) {
                riskFactors.push('LSB correlation anomaly');
                riskScore += 2;
            }
            if (patternAnalysis.suspicious) {
                riskFactors.push('Suspicious pattern repetition');
                riskScore += 2;
            }
            if (metadataAnalysis.suspicious) {
                riskFactors.push(`Suspicious metadata (${metadataAnalysis.anomalies.length} anomalies)`);
                riskScore += metadataAnalysis.riskScore || 2;
            }
            if (histogramAnalysis.suspicious) {
                riskFactors.push('Abnormal histogram distribution');
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
            
            const suspicious = riskScore >= 5; // Umbral ajustado para mejor detección
            const severity = riskScore >= 9 ? 'CRITICAL' : riskScore >= 5 ? 'HIGH' : riskScore >= 3 ? 'MEDIUM' : 'LOW';
            
            return {
                suspicious,
                severity,
                riskScore,
                riskFactors,
                entropy: entropy.toFixed(3),
                fileHash,
                chiSquareResult,
                lsbAnalysis,
                lsbCorrelation,
                patternAnalysis,
                metadataAnalysis,
                channelAnalysis,
                structureAnalysis,
                histogramAnalysis,
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

    // Análisis LSB mejorado con múltiples técnicas
    analyzeLSB(data) {
        const lsbCount = { 0: 0, 1: 0 };
        const planeCount = new Array(8).fill(0).map(() => ({ 0: 0, 1: 0 }));
        
        // Analizar todos los planos de bits, no solo LSB
        const sampleSize = Math.min(data.length, 100000);
        const step = Math.max(1, Math.floor(data.length / sampleSize));
        
        for (let i = 0; i < data.length; i += step) {
            const byte = data[i];
            
            // Analizar cada plano de bits
            for (let bit = 0; bit < 8; bit++) {
                const bitValue = (byte >> bit) & 1;
                planeCount[bit][bitValue]++;
            }
            
            // LSB específico
            const lsb = byte & 1;
            lsbCount[lsb]++;
        }
        
        // Calcular ratios para cada plano
        const planeRatios = planeCount.map((count, bit) => {
            const total = count[0] + count[1];
            const ratio = total > 0 ? Math.abs(count[0] - count[1]) / total : 0;
            return { bit, ratio, count };
        });
        
        // Distribución LSB
        const total = lsbCount[0] + lsbCount[1];
        const lsbRatio = total > 0 ? Math.abs(lsbCount[0] - lsbCount[1]) / total : 0;
        
        // Detectar anomalías en planos superiores (más sospechoso)
        const upperPlanesAnomalies = planeRatios.slice(0, 4).filter(p => p.ratio > 0.6).length;
        const lowerPlanesAnomalies = planeRatios.slice(4).filter(p => p.ratio > 0.5).length;
        
        // Calcular varianza entre planos (baja varianza = sospechoso)
        const ratios = planeRatios.map(p => p.ratio);
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const variance = ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) / ratios.length;
        
        const suspicious = 
            lsbRatio > 0.55 || // Distribución LSB sesgada
            upperPlanesAnomalies >= 2 || // Anomalías en bits superiores
            variance < 0.01; // Varianza muy baja entre planos
        
        return {
            suspicious,
            lsbRatio: lsbRatio.toFixed(3),
            distribution: lsbCount,
            planeRatios: planeRatios.map(p => ({ bit: p.bit, ratio: p.ratio.toFixed(3) })),
            upperPlanesAnomalies,
            lowerPlanesAnomalies,
            variance: variance.toFixed(4),
            reason: suspicious ? 
                `Abnormal bit plane distribution (LSB: ${lsbRatio.toFixed(3)}, Upper anomalies: ${upperPlanesAnomalies})` : 
                'Bit plane distribution appears normal'
        };
    }

    // Análisis de metadata mejorado
    analyzeMetadata(metadata) {
        const anomalies = [];
        let riskScore = 0;
        
        // Densidad inusual
        if (metadata.density && metadata.density > 1000) {
            anomalies.push('Unusually high density');
            riskScore += 2;
        }
        
        // Demasiados tags EXIF
        const exifCount = metadata.exif ? Object.keys(metadata.exif).length : 0;
        if (exifCount > 50) {
            anomalies.push(`Excessive EXIF tags (${exifCount})`);
            riskScore += 2;
        }
        
        // Perfil ICC muy grande
        if (metadata.icc && metadata.icc.length > 100000) {
            anomalies.push(`Large ICC profile (${Math.round(metadata.icc.length / 1024)}KB)`);
            riskScore += 3;
        }
        
        // Metadata inusualmente grande en relación al archivo
        if (metadata.size && exifCount > 0) {
            const exifSize = exifCount * 100; // Estimación aproximada
            const metadataRatio = exifSize / metadata.size;
            
            if (metadataRatio > 0.1) { // Más del 10% es metadata
                anomalies.push('Metadata to file size ratio is unusually high');
                riskScore += 2;
            }
        }
        
        // Buscar campos EXIF sospechosos
        if (metadata.exif) {
            const suspiciousFields = [
                'UserComment',
                'MakerNote',
                'ImageDescription',
                'XPComment',
                'XPKeywords'
            ];
            
            for (const field of suspiciousFields) {
                if (metadata.exif[field]) {
                    const value = metadata.exif[field];
                    if (value && typeof value === 'string' && value.length > 1000) {
                        anomalies.push(`Suspicious EXIF field: ${field} (${value.length} chars)`);
                        riskScore += 2;
                    }
                }
            }
        }
        
        // Orientación inusual o corrupta
        if (metadata.orientation && (metadata.orientation < 1 || metadata.orientation > 8)) {
            anomalies.push('Invalid orientation value');
            riskScore += 1;
        }
        
        const suspicious = riskScore >= 3;
        
        return {
            suspicious,
            riskScore,
            anomalies,
            reason: suspicious ? 'Unusual metadata patterns detected' : 'Metadata appears normal',
            details: {
                hasExif: !!metadata.exif,
                exifCount,
                hasIcc: !!metadata.icc,
                iccSize: metadata.icc ? metadata.icc.length : 0,
                density: metadata.density,
                orientation: metadata.orientation
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
            result.analyzedBy = 'SteganographyDetector v3.0 - Enhanced Detection';
            
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
