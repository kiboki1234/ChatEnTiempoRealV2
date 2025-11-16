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

// Análisis LSB mejorado
function analyzeLSB(data) {
    const lsbCount = { 0: 0, 1: 0 };
    const planeCount = new Array(8).fill(0).map(() => ({ 0: 0, 1: 0 }));
    
    const sampleSize = Math.min(data.length, 100000);
    const step = Math.max(1, Math.floor(data.length / sampleSize));
    
    for (let i = 0; i < data.length; i += step) {
        const byte = data[i];
        
        // Analizar cada plano de bits
        for (let bit = 0; bit < 8; bit++) {
            const bitValue = (byte >> bit) & 1;
            planeCount[bit][bitValue]++;
        }
        
        const lsb = byte & 1;
        lsbCount[lsb]++;
    }
    
    // Calcular ratios
    const planeRatios = planeCount.map((count, bit) => {
        const total = count[0] + count[1];
        const ratio = total > 0 ? Math.abs(count[0] - count[1]) / total : 0;
        return { bit, ratio };
    });
    
    const total = lsbCount[0] + lsbCount[1];
    const lsbRatio = total > 0 ? Math.abs(lsbCount[0] - lsbCount[1]) / total : 0;
    
    const upperPlanesAnomalies = planeRatios.slice(0, 4).filter(p => p.ratio > 0.6).length;
    
    const suspicious = lsbRatio > 0.55 || upperPlanesAnomalies >= 2;
    
    return { 
        suspicious, 
        lsbRatio: lsbRatio.toFixed(3), 
        distribution: lsbCount,
        upperPlanesAnomalies
    };
}

// Análisis de correlación LSB
function analyzeLSBCorrelation(data) {
    const sampleSize = Math.min(data.length, 100000);
    const step = Math.floor(data.length / sampleSize);
    
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < data.length - step; i += step) {
        const lsb1 = data[i] & 1;
        const lsb2 = data[i + step] & 1;
        
        if (lsb1 === lsb2) {
            correlation++;
        }
        count++;
    }
    
    const correlationRatio = count > 0 ? correlation / count : 0;
    const deviation = Math.abs(correlationRatio - 0.5);
    const suspicious = deviation < 0.05;
    
    return { correlationRatio, deviation, suspicious };
}

async function analyzeImage(filePath, threshold = 7.4) {
    try {
        const stats = await fs.stat(filePath);
        const metadata = await sharp(filePath).metadata();
        
        const { data } = await sharp(filePath)
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        const entropy = calculateEntropy(data);
        const lsbAnalysis = analyzeLSB(data);
        const lsbCorrelation = analyzeLSBCorrelation(data);
        
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
        
        const suspicious = 
            entropy > threshold ||
            lsbAnalysis.suspicious ||
            lsbCorrelation.suspicious ||
            channelAnalysis.suspicious;
        
        return {
            success: true,
            result: {
                suspicious,
                entropy: entropy.toFixed(3),
                lsbAnalysis,
                lsbCorrelation,
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
