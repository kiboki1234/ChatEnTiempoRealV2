/**
 * Security Report Generation
 * Creates detailed reports of analysis results
 */

const riskScorer = require('./riskScorer');

/**
 * Generate detailed security report
 */
function generateSecurityReport(analysisResult) {
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
        recommendation: riskScorer.generateRecommendation(analysisResult)
    };
    
    return report;
}

module.exports = {
    generateSecurityReport
};
