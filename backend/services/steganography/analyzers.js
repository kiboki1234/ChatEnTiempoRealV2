/**
 * Statistical Analysis Functions for Steganography Detection
 */

const crypto = require('node:crypto');
const constants = require('./constants');

/**
 * Calculate Shannon entropy of data
 * Higher entropy (>7.3) suggests encrypted or random data
 */
function calculateEntropy(data) {
    const frequency = {};
    let entropy = 0;
    
    // Calculate frequency of each byte
    for (const byte of data) {
        frequency[byte] = (frequency[byte] || 0) + 1;
    }
    
    // Calculate entropy
    for (const byte in frequency) {
        const probability = frequency[byte] / data.length;
        entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
}

/**
 * Calculate file hash for integrity verification
 */
function calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Chi-square test for LSB steganography
 * Detects non-random patterns in least significant bits
 */
function chiSquareTest(data) {
    const pairs = new Array(256).fill(0).map(() => [0, 0]);
    
    // Count LSB pairs
    const sampleSize = Math.min(data.length, 50000);
    for (let i = 0; i < sampleSize; i++) {
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
    
    // Normalize by number of valid pairs
    const normalizedChiSquare = validPairs > 0 ? chiSquare / validPairs : 0;
    
    // Determine severity based on normalized chi-square value
    let severity = 'LOW';
    if (normalizedChiSquare > 5) {
        severity = 'HIGH';
    } else if (normalizedChiSquare > 3) {
        severity = 'MEDIUM';
    }
    
    // Determine confidence level
    let confidence = 'No significant LSB manipulation detected';
    if (normalizedChiSquare > 0.5) {
        confidence = 'High confidence LSB steganography detected';
    } else if (normalizedChiSquare > 0.3) {
        confidence = 'Moderate confidence of LSB manipulation';
    }
    
    return {
        chiSquare: chiSquare.toFixed(2),
        normalizedChiSquare: normalizedChiSquare.toFixed(4),
        degreesOfFreedom: validPairs,
        criticalValue: constants.CHI_SQUARE_THRESHOLD,
        suspicious: normalizedChiSquare > 3,
        severity,
        confidence
    };
}

/**
 * Analyze LSB (Least Significant Bit) patterns
 * Detects abnormal distribution and periodic patterns
 */
function analyzeLSB(data) {
    const lsbCount = { 0: 0, 1: 0 };
    const lsbSequences = [];
    let currentSequence = [];
    let lastLSB = -1;
    
    // Analyze LSB distribution
    for (let i = 0; i < Math.min(data.length, 100000); i++) {
        const lsb = data[i] & 1;
        lsbCount[lsb]++;
        
        // Detect suspicious sequences
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
    
    // In natural images, LSB should be close to 50/50
    const total = lsbCount[0] + lsbCount[1];
    const ratio = Math.abs(lsbCount[0] - lsbCount[1]) / total;
    const expectedRatio = 0.5;
    const deviation = Math.abs(ratio - expectedRatio);
    
    // Detect periodic patterns (common in LSB steganography)
    let periodicScore = 0;
    if (lsbSequences.length > 5) {
        periodicScore = lsbSequences.length / 10;
    }
    
    const suspicious = ratio > constants.LSB_RATIO_THRESHOLD || periodicScore > 2;
    
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

/**
 * Analyze byte frequency distribution
 * Detects unusual patterns suggesting encryption or random data
 */
function analyzeByteFrequency(data) {
    const frequency = new Array(256).fill(0);
    const sampleSize = Math.min(data.length, 50000);
    
    for (let i = 0; i < sampleSize; i++) {
        frequency[data[i]]++;
    }
    
    // Calculate standard deviation
    const mean = sampleSize / 256;
    let variance = 0;
    for (let i = 0; i < 256; i++) {
        variance += Math.pow(frequency[i] - mean, 2);
    }
    variance /= 256;
    const stdDev = Math.sqrt(variance);
    
    // In natural images, distribution should be relatively uniform
    // Very low deviation suggests random/encrypted data
    const coefficient = stdDev / mean;
    
    // Detect bytes that never appear (suspicious in large images)
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

/**
 * Analyze metadata for suspicious patterns
 */
function analyzeMetadata(metadata) {
    const findings = [];
    let suspicious = false;
    
    // Check for unusually high density
    if (metadata.density > 1000) {
        findings.push('Unusually high density');
        suspicious = true;
    }
    
    // Check for excessive EXIF tags
    if (metadata.exif && Object.keys(metadata.exif).length > 50) {
        findings.push('Too many EXIF tags');
        suspicious = true;
    }
    
    // Check for large ICC profile
    if (metadata.icc && metadata.icc.length > 100000) {
        findings.push('Large ICC profile');
        suspicious = true;
    }
    
    return {
        suspicious,
        findings,
        reason: suspicious ? 'Unusual metadata patterns detected' : 'Metadata appears normal',
        details: {
            hasExif: !!metadata.exif,
            hasIcc: !!metadata.icc,
            density: metadata.density
        }
    };
}

module.exports = {
    calculateEntropy,
    calculateFileHash,
    chiSquareTest,
    analyzeLSB,
    analyzeByteFrequency,
    analyzeMetadata
};
