const express = require('express');
const router = express.Router();
const quarantineService = require('../services/quarantineService');
const steganographyDetector = require('../services/steganographyDetector');
const AuditLog = require('../models/AuditLog');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

// Get all quarantined files (Admin only)
router.get('/quarantine', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const files = await quarantineService.getQuarantinedFiles();
        
        res.json({
            success: true,
            count: files.length,
            files: files.map(file => ({
                fileName: file.fileName,
                originalPath: file.originalPath,
                timestamp: file.timestamp,
                riskScore: file.analysisResult?.riskScore,
                severity: file.analysisResult?.severity,
                riskFactors: file.analysisResult?.riskFactors,
                userMetadata: file.userMetadata
            }))
        });
    } catch (error) {
        console.error('Error getting quarantined files:', error);
        res.status(500).json({ error: 'Error retrieving quarantined files' });
    }
});

// Get detailed analysis of a quarantined file (Admin only)
router.get('/quarantine/:fileName', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { fileName } = req.params;
        const files = await quarantineService.getQuarantinedFiles();
        const file = files.find(f => f.fileName === fileName);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found in quarantine' });
        }
        
        // Generate detailed security report
        const securityReport = steganographyDetector.generateSecurityReport(file.analysisResult);
        
        res.json({
            success: true,
            file: {
                ...file,
                securityReport
            }
        });
    } catch (error) {
        console.error('Error getting quarantined file details:', error);
        res.status(500).json({ error: 'Error retrieving file details' });
    }
});

// Delete quarantined file (Admin only)
router.delete('/quarantine/:fileName', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { fileName } = req.params;
        await quarantineService.deleteQuarantinedFile(fileName);
        
        await AuditLog.create({
            action: 'QUARANTINE_FILE_DELETED',
            userId: req.user._id,
            username: req.user.username,
            ipAddress: req.ip,
            details: {
                fileName
            }
        });
        
        res.json({
            success: true,
            message: 'File deleted from quarantine'
        });
    } catch (error) {
        console.error('Error deleting quarantined file:', error);
        res.status(500).json({ error: 'Error deleting file' });
    }
});

// Clean old quarantined files (Admin only)
router.post('/quarantine/clean', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;
        const result = await quarantineService.cleanOldFiles(daysToKeep);
        
        await AuditLog.create({
            action: 'QUARANTINE_CLEANUP',
            userId: req.user._id,
            username: req.user.username,
            ipAddress: req.ip,
            details: {
                daysToKeep,
                deletedCount: result.deletedCount
            }
        });
        
        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `Deleted ${result.deletedCount} old quarantined files`
        });
    } catch (error) {
        console.error('Error cleaning quarantined files:', error);
        res.status(500).json({ error: 'Error cleaning quarantine' });
    }
});

// Get security statistics (Admin only)
router.get('/statistics', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        // Get audit logs for security events
        const securityLogs = await AuditLog.find({
            createdAt: { $gte: startDate },
            action: {
                $in: ['FILE_REJECTED', 'FILE_APPROVED', 'FILE_QUARANTINED', 'FILE_ANALYSIS_ERROR']
            }
        }).sort({ createdAt: -1 });
        
        // Calculate statistics
        const stats = {
            totalAnalyzed: securityLogs.length,
            rejected: securityLogs.filter(log => log.action === 'FILE_REJECTED').length,
            approved: securityLogs.filter(log => log.action === 'FILE_APPROVED').length,
            quarantined: securityLogs.filter(log => log.action === 'FILE_QUARANTINED').length,
            errors: securityLogs.filter(log => log.action === 'FILE_ANALYSIS_ERROR').length,
            rejectionRate: 0,
            severityBreakdown: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0
            },
            topRiskFactors: {}
        };
        
        if (stats.totalAnalyzed > 0) {
            stats.rejectionRate = ((stats.rejected / stats.totalAnalyzed) * 100).toFixed(2);
        }
        
        // Analyze severity and risk factors
        securityLogs.forEach(log => {
            if (log.details?.severity) {
                stats.severityBreakdown[log.details.severity]++;
            }
            
            if (log.details?.analysis?.riskFactors) {
                log.details.analysis.riskFactors.forEach(factor => {
                    stats.topRiskFactors[factor] = (stats.topRiskFactors[factor] || 0) + 1;
                });
            }
        });
        
        // Get quarantine info
        const quarantinedFiles = await quarantineService.getQuarantinedFiles();
        
        res.json({
            success: true,
            period: {
                days: parseInt(days),
                startDate,
                endDate: new Date()
            },
            statistics: stats,
            quarantine: {
                totalFiles: quarantinedFiles.length,
                files: quarantinedFiles.slice(0, 10) // Last 10 files
            }
        });
    } catch (error) {
        console.error('Error getting security statistics:', error);
        res.status(500).json({ error: 'Error retrieving statistics' });
    }
});

// Get recent security alerts (Admin only)
router.get('/alerts', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const alerts = await AuditLog.find({
            action: { $in: ['FILE_REJECTED', 'FILE_QUARANTINED'] }
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
        
        res.json({
            success: true,
            alerts: alerts.map(alert => ({
                id: alert._id,
                action: alert.action,
                timestamp: alert.createdAt,
                username: alert.username,
                fileName: alert.details?.filename,
                riskScore: alert.details?.riskScore,
                severity: alert.details?.severity,
                riskFactors: alert.details?.analysis?.riskFactors
            }))
        });
    } catch (error) {
        console.error('Error getting security alerts:', error);
        res.status(500).json({ error: 'Error retrieving alerts' });
    }
});

module.exports = router;
