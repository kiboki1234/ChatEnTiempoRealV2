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

// Main worker execution
(async () => {
    try {
        const { filePath, fileType, threshold } = workerData;
        const result = await analyzeImage(filePath, threshold);
        parentPort.postMessage(result);
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
})();
