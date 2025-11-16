/**
 * Non-Image File Analysis
 * Handles PDFs, documents, and other file types
 */

const fs = require('node:fs').promises;
const path = require('node:path');
const analyzers = require('./analyzers');
const signatureDetector = require('./signatureDetector');
const structureAnalyzer = require('./structureAnalyzer');
const constants = require('./constants');

/**
 * Analyze non-image files (PDFs, documents)
 */
async function analyzeFile(filePath) {
    const stats = await fs.stat(filePath);
    
    // Check file size
    if (stats.size > constants.MAX_FILE_SIZE) {
        return {
            suspicious: true,
            severity: 'MEDIUM',
            reason: 'File size exceeds limit'
        };
    }
    
    // Read file data
    const buffer = await fs.readFile(filePath);
    
    // Calculate file hash
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
    
    // Calculate entropy
    const entropy = analyzers.calculateEntropy(buffer);
    
    // Check for suspicious patterns
    const hasNullBytes = buffer.includes(0x00);
    const hasHighEntropy = entropy > constants.ENTROPY_THRESHOLD;
    
    // Analyze file structure
    const ext = path.extname(filePath).toLowerCase();
    let structureAnalysis = { suspicious: false, anomalies: [] };
    
    if (ext === '.pdf') {
        structureAnalysis = structureAnalyzer.analyzePDFStructure(buffer);
    }
    
    // Calculate risk score
    let riskScore = 0;
    const riskFactors = [];
    
    if (hasHighEntropy) {
        riskFactors.push('High entropy');
        riskScore += constants.RISK_WEIGHTS.HIGH_ENTROPY + 1; // +3 for files
    }
    if (stegoFindings.length > 0) {
        riskFactors.push('Steganography signatures');
        riskScore += constants.RISK_WEIGHTS.STEGO_SIGNATURE;
    }
    if (structureAnalysis.suspicious) {
        riskFactors.push('Structure anomalies');
        riskScore += constants.RISK_WEIGHTS.METADATA_SUSPICIOUS;
    }
    
    const suspicious = riskScore >= constants.RISK_SCORE_THRESHOLD;
    
    // Determine severity based on risk score
    let severity = 'MEDIUM';
    if (riskScore >= 7) {
        severity = 'CRITICAL';
    } else if (riskScore >= 4) {
        severity = 'HIGH';
    }
    
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
}

module.exports = {
    analyzeFile
};
