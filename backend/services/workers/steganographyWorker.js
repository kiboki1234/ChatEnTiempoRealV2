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

// Analyze LSB patterns
function analyzeLSB(data) {
    const lsbCount = { 0: 0, 1: 0 };
    
    for (let i = 0; i < data.length; i += 100) {
        const lsb = data[i] & 1;
        lsbCount[lsb]++;
    }
    
    const total = lsbCount[0] + lsbCount[1];
    const ratio = Math.abs(lsbCount[0] - lsbCount[1]) / total;
    const suspicious = ratio > 0.6;
    
    return { suspicious, ratio, distribution: lsbCount };
}

async function analyzeImage(filePath, threshold = 7.5) {
    try {
        const stats = await fs.stat(filePath);
        const metadata = await sharp(filePath).metadata();
        
        const { data } = await sharp(filePath)
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        const entropy = calculateEntropy(data);
        const lsbAnalysis = analyzeLSB(data);
        
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
            channelAnalysis.suspicious;
        
        return {
            success: true,
            result: {
                suspicious,
                entropy: entropy.toFixed(3),
                lsbAnalysis,
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
