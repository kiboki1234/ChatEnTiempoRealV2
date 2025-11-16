const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');
const fs = require('fs').promises;

// Calculate Shannon entropy
function calculateEntropy(data) {
    const frequency = {};
    let entropy = 0;
    
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        frequency[byte] = (frequency[byte] || 0) + 1;
    }
    
    for (const byte in frequency) {
        const probability = frequency[byte] / data.length;
        entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
}

// Analyze LSB patterns - MEJORADO
function analyzeLSB(data) {
    const lsbCount = { 0: 0, 1: 0 };
    const sampleSize = Math.min(data.length, 100000);
    
    // Analizar más datos para mejor precisión
    for (let i = 0; i < sampleSize; i++) {
        const lsb = data[i] & 1;
        lsbCount[lsb]++;
    }
    
    const total = lsbCount[0] + lsbCount[1];
    const ratio = Math.abs(lsbCount[0] - lsbCount[1]) / total;
    
    // Detectar secuencias periódicas
    let periodicCount = 0;
    const period = 8; // Común en esteganografía
    for (let i = 0; i < Math.min(sampleSize - period, 10000); i++) {
        if ((data[i] & 1) === (data[i + period] & 1)) {
            periodicCount++;
        }
    }
    const periodicScore = periodicCount / Math.min(sampleSize - period, 10000);
    
    // Calcular desviación de distribución ideal (50/50)
    const expectedCount = total / 2;
    const deviation = Math.max(
        Math.abs(lsbCount[0] - expectedCount),
        Math.abs(lsbCount[1] - expectedCount)
    ) / total;
    
    // Umbral más estricto: 0.55 en lugar de 0.6
    const suspicious = ratio > 0.55 || periodicScore > 0.7 || deviation > 0.05;
    
    return { 
        suspicious, 
        ratio: ratio.toFixed(3),
        periodicScore: periodicScore.toFixed(3),
        deviation: deviation.toFixed(3),
        distribution: lsbCount,
        reason: periodicScore > 0.7 ? 'Periodic LSB pattern detected' : 
                ratio > 0.55 ? 'Abnormal LSB distribution' :
                deviation > 0.05 ? 'High deviation from expected distribution' :
                'LSB distribution appears normal'
    };
}

// Chi-square test - MEJORADO
function chiSquareTest(data) {
    const pairs = new Array(256).fill(0).map(() => [0, 0]);
    const sampleSize = Math.min(data.length, 50000);
    
    for (let i = 0; i < sampleSize; i++) {
        const value = data[i];
        const lsb = value & 1;
        pairs[value >> 1][lsb]++;
    }
    
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
    
    const normalizedChiSquare = validPairs > 0 ? chiSquare / validPairs : 0;
    const suspicious = normalizedChiSquare > 0.3; // Umbral más estricto
    
    return {
        chiSquare: chiSquare.toFixed(2),
        normalizedChiSquare: normalizedChiSquare.toFixed(4),
        suspicious,
        severity: normalizedChiSquare > 0.5 ? 'HIGH' : normalizedChiSquare > 0.3 ? 'MEDIUM' : 'LOW'
    };
}

async function analyzeImage(filePath, threshold = 7.0) {
    try {
        const stats = await fs.stat(filePath);
        const metadata = await sharp(filePath).metadata();
        
        const { data } = await sharp(filePath)
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        const entropy = calculateEntropy(data);
        const lsbAnalysis = analyzeLSB(data);
        const chiSquareResult = chiSquareTest(data);
        
        // Analyze color channels
        let channelAnalysis = { suspicious: false };
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
            
            const redEntropy = calculateEntropy(red);
            const greenEntropy = calculateEntropy(green);
            const blueEntropy = calculateEntropy(blue);
            
            const maxEntropy = Math.max(redEntropy, greenEntropy, blueEntropy);
            
            channelAnalysis = {
                suspicious: maxEntropy > threshold,
                channelEntropy: {
                    red: redEntropy.toFixed(3),
                    green: greenEntropy.toFixed(3),
                    blue: blueEntropy.toFixed(3)
                },
                maxEntropy: maxEntropy.toFixed(3)
            };
        } catch (error) {
            // Channel analysis failed, not critical
        }
        
        // Sistema de puntuación mejorado
        let riskScore = 0;
        const riskFactors = [];
        
        if (entropy > threshold) {
            riskScore += 3;
            riskFactors.push(`High entropy: ${entropy.toFixed(3)}`);
        }
        if (chiSquareResult.suspicious) {
            riskScore += chiSquareResult.severity === 'HIGH' ? 4 : 3;
            riskFactors.push(`Chi-square test failed: ${chiSquareResult.severity}`);
        }
        if (lsbAnalysis.suspicious) {
            riskScore += lsbAnalysis.periodicScore > 0.7 ? 4 : 2;
            riskFactors.push(`LSB anomalies: ${lsbAnalysis.reason}`);
        }
        if (channelAnalysis.suspicious) {
            riskScore += 2;
            riskFactors.push('High channel entropy');
        }
        
        // Umbral más bajo: 3 puntos en lugar de 4
        const suspicious = riskScore >= 3;
        const severity = riskScore >= 8 ? 'CRITICAL' : riskScore >= 5 ? 'HIGH' : riskScore >= 3 ? 'MEDIUM' : 'LOW';
        
        return {
            success: true,
            result: {
                suspicious,
                severity,
                riskScore,
                riskFactors,
                entropy: entropy.toFixed(3),
                lsbAnalysis,
                chiSquareResult,
                channelAnalysis,
                fileInfo: {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    size: stats.size
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Analyze non-image files
async function analyzeFile(filePath, threshold = 7.9) {
    try {
        const stats = await fs.stat(filePath);
        const buffer = await fs.readFile(filePath);
        
        const entropy = calculateEntropy(buffer);
        
        // Most compressed formats (PDF, ZIP, videos, etc.) have entropy 7.5-7.9
        // Only flag if entropy is EXTREMELY high (>7.9) which suggests additional encryption/steganography
        const suspicious = entropy > threshold;
        
        return {
            success: true,
            result: {
                suspicious,
                entropy: entropy.toFixed(3),
                fileSize: stats.size,
                hasNullBytes: buffer.includes(0x00),
                reason: suspicious ? 'Extremely high entropy suggests possible hidden data or additional encryption' : 'File entropy is within normal range for compressed formats'
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Main worker execution
(async () => {
    try {
        const { filePath, fileType, threshold } = workerData;
        
        // Determine if it's an image or other file type
        const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType);
        
        const result = isImage 
            ? await analyzeImage(filePath, threshold)
            : await analyzeFile(filePath, threshold);
            
        parentPort.postMessage(result);
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
})();
