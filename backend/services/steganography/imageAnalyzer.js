/**
 * Image-Specific Analysis Functions
 * Handles color channel analysis and image metadata
 */

const sharp = require('sharp');
const fs = require('node:fs').promises;
const analyzers = require('./analyzers');
const signatureDetector = require('./signatureDetector');
const structureAnalyzer = require('./structureAnalyzer');
const riskScorer = require('./riskScorer');
const constants = require('./constants');

/**
 * Analyze color channels for anomalies
 * Detects hidden data in RGB channels
 */
async function analyzeColorChannels(filePath) {
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
        
        const redEntropy = analyzers.calculateEntropy(red);
        const greenEntropy = analyzers.calculateEntropy(green);
        const blueEntropy = analyzers.calculateEntropy(blue);
        
        // Check if any channel has unusually high entropy
        const maxEntropy = Math.max(redEntropy, greenEntropy, blueEntropy);
        const suspicious = maxEntropy > constants.ENTROPY_THRESHOLD;
        
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

/**
 * Comprehensive image analysis
 * Runs all detection techniques on image files
 */
async function analyzeImage(filePath) {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    
    // Check file size
    if (stats.size > constants.MAX_FILE_SIZE) {
        return {
            suspicious: true,
            reason: 'File size exceeds limit',
            severity: 'MEDIUM',
            details: { fileSize: stats.size, maxSize: constants.MAX_FILE_SIZE }
        };
    }
    
    // Calculate file hash for integrity
    const fileHash = analyzers.calculateFileHash(buffer);
    
    // Check for malicious signatures
    const maliciousFindings = signatureDetector.checkMaliciousSignatures(buffer);
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
    const stegoFindings = signatureDetector.checkSteganographySignatures(buffer);
    
    // Read image metadata
    const metadata = await sharp(filePath).metadata();
    
    // Read raw pixel data
    const { data } = await sharp(filePath)
        .raw()
        .toBuffer({ resolveWithObject: true });
    
    // Run all analysis techniques
    const entropy = analyzers.calculateEntropy(data);
    const chiSquareResult = analyzers.chiSquareTest(data);
    const lsbAnalysis = analyzers.analyzeLSB(data);
    const metadataAnalysis = analyzers.analyzeMetadata(metadata);
    const channelAnalysis = await analyzeColorChannels(filePath);
    const structureAnalysis = structureAnalyzer.analyzeFileStructure(buffer, metadata.format);
    const hiddenTextFindings = signatureDetector.detectHiddenText(buffer);
    const frequencyAnalysis = analyzers.analyzeByteFrequency(data);
    const trailingDataFindings = signatureDetector.detectTrailingData(buffer, metadata.format, analyzers.calculateEntropy);
    
    // Calculate risk score
    const riskAssessment = riskScorer.calculateRiskScore({
        entropy,
        chiSquareResult,
        lsbAnalysis,
        metadataAnalysis,
        channelAnalysis,
        structureAnalysis,
        stegoFindings,
        hiddenTextFindings,
        frequencyAnalysis,
        trailingDataFindings
    });
    
    return {
        suspicious: riskAssessment.suspicious,
        severity: riskAssessment.severity,
        riskScore: riskAssessment.riskScore,
        riskFactors: riskAssessment.riskFactors,
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
}

module.exports = {
    analyzeColorChannels,
    analyzeImage
};
