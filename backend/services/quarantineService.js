const fs = require('fs').promises;
const path = require('path');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class QuarantineService {
    constructor() {
        this.quarantineDir = path.join(__dirname, '../quarantine');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.quarantineDir, { recursive: true });
        } catch (error) {
            logger.error('Error creating quarantine directory', { error: error.message });
        }
    }

    // Move suspicious file to quarantine
    async quarantineFile(filePath, analysisResult, metadata = {}) {
        try {
            const fileName = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const quarantinedFileName = `${timestamp}_${fileName}`;
            const quarantinedPath = path.join(this.quarantineDir, quarantinedFileName);

            // Copy file to quarantine
            await fs.copyFile(filePath, quarantinedPath);

            // Create metadata file
            const metadataPath = quarantinedPath + '.meta.json';
            const quarantineMetadata = {
                originalPath: filePath,
                quarantinedPath,
                timestamp: new Date(),
                analysisResult,
                userMetadata: metadata,
                status: 'QUARANTINED'
            };

            await fs.writeFile(metadataPath, JSON.stringify(quarantineMetadata, null, 2));

            // Log quarantine action
            await AuditLog.create({
                action: 'FILE_QUARANTINED',
                userId: metadata.userId || 'system',
                username: metadata.username || 'system',
                ipAddress: metadata.ipAddress || 'unknown',
                details: {
                    fileName,
                    originalPath: filePath,
                    quarantinedPath,
                    riskScore: analysisResult.riskScore,
                    severity: analysisResult.severity,
                    riskFactors: analysisResult.riskFactors
                }
            });

            return {
                success: true,
                quarantinedPath,
                metadataPath
            };
        } catch (error) {
            logger.error('Error quarantining file', { filePath, error: error.message });
            throw error;
        }
    }

    // Get list of quarantined files
    async getQuarantinedFiles() {
        try {
            const files = await fs.readdir(this.quarantineDir);
            const quarantinedFiles = [];

            for (const file of files) {
                if (file.endsWith('.meta.json')) {
                    const metadataPath = path.join(this.quarantineDir, file);
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                    quarantinedFiles.push({
                        fileName: file.replace('.meta.json', ''),
                        ...metadata
                    });
                }
            }

            return quarantinedFiles;
        } catch (error) {
            logger.error('Error getting quarantined files', { error: error.message });
            return [];
        }
    }

    // Delete quarantined file
    async deleteQuarantinedFile(fileName) {
        try {
            const filePath = path.join(this.quarantineDir, fileName);
            const metadataPath = filePath + '.meta.json';

            await fs.unlink(filePath);
            await fs.unlink(metadataPath);

            await AuditLog.create({
                action: 'QUARANTINE_FILE_DELETED',
                userId: 'admin',
                username: 'admin',
                ipAddress: 'system',
                details: {
                    fileName
                }
            });

            return { success: true };
        } catch (error) {
            logger.error('Error deleting quarantined file', { fileName, error: error.message });
            throw error;
        }
    }

    // Restore quarantined file (admin only)
    async restoreQuarantinedFile(fileName) {
        try {
            const metadataPath = path.join(this.quarantineDir, fileName + '.meta.json');
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

            await AuditLog.create({
                action: 'QUARANTINE_FILE_RESTORED',
                userId: 'admin',
                username: 'admin',
                ipAddress: 'system',
                details: {
                    fileName,
                    warning: 'File restored despite security concerns'
                }
            });

            return {
                success: true,
                metadata
            };
        } catch (error) {
            logger.error('Error restoring quarantined file', { fileName, error: error.message });
            throw error;
        }
    }

    // Clean old quarantined files (older than 30 days)
    async cleanOldFiles(daysToKeep = 30) {
        try {
            const files = await this.getQuarantinedFiles();
            const now = new Date();
            const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
            let deletedCount = 0;

            for (const file of files) {
                const fileAge = now - new Date(file.timestamp);
                if (fileAge > maxAge) {
                    await this.deleteQuarantinedFile(file.fileName);
                    deletedCount++;
                }
            }

            logger.info('Cleaned old quarantined files', { deletedCount });
            return { deletedCount };
        } catch (error) {
            logger.error('Error cleaning old files', { error: error.message });
            throw error;
        }
    }
}

module.exports = new QuarantineService();
