/**
 * Risk Scoring System
 * Calculates overall risk score based on multiple analysis results
 */

const constants = require('./constants');

/**
 * Evaluate entropy risk
 */
function evaluateEntropyRisk(entropy, riskFactors) {
    if (entropy > constants.ENTROPY_THRESHOLD) {
        riskFactors.push(`High entropy detected: ${entropy.toFixed(3)}`);
        return constants.RISK_WEIGHTS.HIGH_ENTROPY;
    }
    return 0;
}

/**
 * Evaluate chi-square test risk
 */
function evaluateChiSquareRisk(chiSquareResult, riskFactors) {
    if (chiSquareResult.suspicious) {
        riskFactors.push(`Chi-square test failed: ${chiSquareResult.confidence}`);
        return chiSquareResult.severity === 'HIGH' 
            ? constants.RISK_WEIGHTS.CHI_SQUARE_HIGH 
            : constants.RISK_WEIGHTS.CHI_SQUARE_MEDIUM;
    }
    return 0;
}

/**
 * Evaluate LSB analysis risk
 */
function evaluateLSBRisk(lsbAnalysis, riskFactors) {
    if (lsbAnalysis.suspicious) {
        riskFactors.push(`LSB anomalies: ${lsbAnalysis.reason}`);
        return lsbAnalysis.periodicScore > 0.75 
            ? constants.RISK_WEIGHTS.LSB_PERIODIC 
            : constants.RISK_WEIGHTS.LSB_ABNORMAL;
    }
    return 0;
}

/**
 * Evaluate metadata risk
 */
function evaluateMetadataRisk(metadataAnalysis, riskFactors) {
    if (metadataAnalysis.suspicious) {
        riskFactors.push(`Suspicious metadata: ${metadataAnalysis.findings.join(', ')}`);
        return constants.RISK_WEIGHTS.METADATA_SUSPICIOUS;
    }
    return 0;
}

/**
 * Evaluate structure and signature risks
 */
function evaluateStructureRisks(structureAnalysis, stegoFindings, hiddenTextFindings, riskFactors) {
    let risk = 0;
    
    if (structureAnalysis.suspicious) {
        riskFactors.push(`File structure anomalies: ${structureAnalysis.findings.join(', ')}`);
        risk += constants.RISK_WEIGHTS.STRUCTURE_ANOMALY;
    }
    
    if (stegoFindings.length > 0) {
        riskFactors.push(`Steganography signatures: ${stegoFindings.map(f => f.tool).join(', ')}`);
        risk += constants.RISK_WEIGHTS.STEGO_SIGNATURE;
    }
    
    if (hiddenTextFindings.length > 0) {
        riskFactors.push(`Hidden text patterns: ${hiddenTextFindings.map(f => f.pattern).join(', ')}`);
        risk += constants.RISK_WEIGHTS.HIDDEN_TEXT;
    }
    
    return risk;
}

/**
 * Evaluate data analysis risks
 */
function evaluateDataRisks(channelAnalysis, frequencyAnalysis, trailingDataFindings, riskFactors) {
    let risk = 0;
    
    if (channelAnalysis.suspicious) {
        riskFactors.push('High channel entropy detected');
        risk += constants.RISK_WEIGHTS.CHANNEL_ENTROPY;
    }
    
    if (frequencyAnalysis.suspicious) {
        riskFactors.push(`Unusual byte distribution: ${frequencyAnalysis.reason}`);
        risk += constants.RISK_WEIGHTS.BYTE_FREQUENCY;
    }
    
    if (trailingDataFindings.length > 0) {
        const trailing = trailingDataFindings[0];
        riskFactors.push(`${trailing.bytes} trailing bytes with entropy ${trailing.entropy}`);
        risk += trailing.severity === 'HIGH' 
            ? constants.RISK_WEIGHTS.TRAILING_DATA_HIGH 
            : constants.RISK_WEIGHTS.TRAILING_DATA_MEDIUM;
    }
    
    return risk;
}

/**
 * Determine severity level from risk score
 */
function determineSeverity(riskScore) {
    if (riskScore >= 10) return 'CRITICAL';  // Very strong indicators
    if (riskScore >= 7) return 'HIGH';       // Multiple indicators
    if (riskScore >= 5) return 'MEDIUM';     // Some indicators
    return 'LOW';                             // Minor anomalies
}

/**
 * Calculate comprehensive risk score
 * Combines results from all analysis techniques
 */
function calculateRiskScore(analysisResults) {
    const {
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
    } = analysisResults;
    
    const riskFactors = [];
    let riskScore = 0;
    
    // High entropy
    if (entropy > constants.ENTROPY_THRESHOLD) {
        riskFactors.push(`High entropy detected: ${entropy.toFixed(3)}`);
        riskScore += constants.RISK_WEIGHTS.HIGH_ENTROPY;
    }
    
    // Chi-square test
    if (chiSquareResult.suspicious) {
        riskFactors.push(`Chi-square test failed: ${chiSquareResult.confidence}`);
        riskScore += chiSquareResult.severity === 'HIGH' 
            ? constants.RISK_WEIGHTS.CHI_SQUARE_HIGH 
            : constants.RISK_WEIGHTS.CHI_SQUARE_MEDIUM;
    }
    
    // LSB analysis
    if (lsbAnalysis.suspicious) {
        riskFactors.push(`LSB anomalies: ${lsbAnalysis.reason}`);
        riskScore += lsbAnalysis.periodicScore > 0.75 
            ? constants.RISK_WEIGHTS.LSB_PERIODIC 
            : constants.RISK_WEIGHTS.LSB_ABNORMAL;
    }
    
    // Metadata analysis
    if (metadataAnalysis.suspicious) {
        riskFactors.push(`Suspicious metadata: ${metadataAnalysis.findings.join(', ')}`);
        riskScore += constants.RISK_WEIGHTS.METADATA_SUSPICIOUS;
    }
    
    // Channel analysis
    if (channelAnalysis.suspicious) {
        riskFactors.push('High channel entropy detected');
        riskScore += constants.RISK_WEIGHTS.CHANNEL_ENTROPY;
    }
    
    // Structure analysis
    if (structureAnalysis.suspicious) {
        riskFactors.push(`File structure anomalies: ${structureAnalysis.findings.join(', ')}`);
        riskScore += constants.RISK_WEIGHTS.STRUCTURE_ANOMALY;
    }
    
    // Steganography tool signatures
    if (stegoFindings.length > 0) {
        riskFactors.push(`Steganography signatures: ${stegoFindings.map(f => f.tool).join(', ')}`);
        riskScore += constants.RISK_WEIGHTS.STEGO_SIGNATURE;
    }
    
    // Hidden text patterns
    if (hiddenTextFindings.length > 0) {
        riskFactors.push(`Hidden text patterns: ${hiddenTextFindings.map(f => f.pattern).join(', ')}`);
        riskScore += constants.RISK_WEIGHTS.HIDDEN_TEXT;
    }
    
    // Byte frequency analysis
    if (frequencyAnalysis.suspicious) {
        riskFactors.push(`Unusual byte distribution: ${frequencyAnalysis.reason}`);
        riskScore += constants.RISK_WEIGHTS.BYTE_FREQUENCY;
    }
    
    // Trailing data
    if (trailingDataFindings.length > 0) {
        const trailing = trailingDataFindings[0];
        riskFactors.push(`${trailing.bytes} trailing bytes with entropy ${trailing.entropy}`);
        riskScore += trailing.severity === 'HIGH' 
            ? constants.RISK_WEIGHTS.TRAILING_DATA_HIGH 
            : constants.RISK_WEIGHTS.TRAILING_DATA_MEDIUM;
    }
    
    // Determine overall severity (aligned with new thresholds)
    const suspicious = riskScore >= constants.RISK_SCORE_THRESHOLD;
    const severity = riskScore >= 10 ? 'CRITICAL'  // Very strong indicators
                   : riskScore >= 7 ? 'HIGH'        // Multiple indicators (threshold)
                   : riskScore >= 5 ? 'MEDIUM'      // Some indicators
                   : 'LOW';                         // Minor anomalies
    
    return {
        suspicious,
        severity,
        riskScore,
        riskFactors
    };
}

/**
 * Generate recommendation based on analysis result
 */
function generateRecommendation(analysisResult) {
    if (!analysisResult.suspicious) {
        return 'File appears safe and can be uploaded.';
    }
    
    if (analysisResult.maliciousFindings && analysisResult.maliciousFindings.length > 0) {
        return 'CRITICAL: File contains malicious content and must be rejected immediately.';
    }
    
    if (analysisResult.riskScore >= 10) {
        return 'CRITICAL RISK: File shows strong indicators of steganography or manipulation. Must be rejected.';
    }
    
    if (analysisResult.riskScore >= 7) {
        return 'HIGH RISK: File shows multiple suspicious patterns. Strongly recommend rejection.';
    }
    
    if (analysisResult.riskScore >= 5) {
        return 'MODERATE RISK: File shows some anomalies. May be acceptable with caution.';
    }
    
    return 'File shows minor anomalies but is generally safe.';
}

module.exports = {
    calculateRiskScore,
    generateRecommendation
};
