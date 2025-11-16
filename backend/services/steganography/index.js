/**
 * Steganography Detector Main Module
 * Orchestrates all analysis components
 */

const AuditLog = require('../../models/AuditLog');
const logger = require('../../utils/logger');
const imageAnalyzer = require('./imageAnalyzer');
const fileAnalyzer = require('./fileAnalyzer');
const reportGenerator = require('./reportGenerator');

class SteganographyDetector {
    /**
     * Main analysis function
     * Routes to appropriate analyzer based on file type
     */
    async analyze(filePath, fileType, userId, username, ipAddress) {
        try {
            let result;
            
            // Route to appropriate analyzer
            if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType)) {
                result = await imageAnalyzer.analyzeImage(filePath);
            } else {
                result = await fileAnalyzer.analyzeFile(filePath);
            }
            
            // Add metadata
            result.timestamp = new Date();
            result.fileType = fileType;
            result.analyzedBy = 'SteganographyDetector v3.0 (Modular)';
            
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

    /**
     * Generate detailed security report
     */
    generateSecurityReport(analysisResult) {
        return reportGenerator.generateSecurityReport(analysisResult);
    }
}

module.exports = new SteganographyDetector();
