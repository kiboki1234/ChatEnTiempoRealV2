const mongoose = require('mongoose');
const crypto = require('crypto');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['LOGIN', 'LOGOUT', 'REGISTER', 'USER_AUTO_REGISTER', 'CREATE_ROOM', 'DELETE_ROOM', 'JOIN_ROOM', 'LEAVE_ROOM', 
               'SEND_MESSAGE', 'UPLOAD_FILE', 'FILE_REJECTED', 'FILE_APPROVED', 'FILE_QUARANTINED', 'FILE_ANALYSIS_ERROR',
               'QUARANTINE_FILE_DELETED', 'QUARANTINE_CLEANUP', 'ADMIN_ACTION', 'SECURITY_ALERT', 'SETUP_2FA', 'ENABLE_2FA', 'DISABLE_2FA']
    },
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    roomPin: {
        type: String,
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    signature: {
        type: String,
        required: false  // Will be generated automatically by pre-save hook
    }
}, { timestamps: false });

// Generate digital signature for log entry BEFORE validation
auditLogSchema.pre('validate', function(next) {
    if (this.signature) return next();
    
    const data = JSON.stringify({
        action: this.action,
        userId: this.userId,
        username: this.username,
        ipAddress: this.ipAddress,
        timestamp: this.timestamp || new Date(),
        details: this.details || {}
    });
    
    const secret = process.env.AUDIT_SECRET || 'default-audit-secret-change-in-production';
    this.signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
    
    next();
});

// Method to verify log signature
auditLogSchema.methods.verifySignature = function() {
    const data = JSON.stringify({
        action: this.action,
        userId: this.userId,
        username: this.username,
        ipAddress: this.ipAddress,
        timestamp: this.timestamp,
        details: this.details
    });
    
    const secret = process.env.AUDIT_SECRET || 'default-audit-secret-change-in-production';
    const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
    
    return computedSignature === this.signature;
};

// Prevent modifications after creation
auditLogSchema.pre('findOneAndUpdate', function(next) {
    next(new Error('AuditLog entries cannot be modified'));
});

auditLogSchema.pre('updateOne', function(next) {
    next(new Error('AuditLog entries cannot be modified'));
});

auditLogSchema.pre('updateMany', function(next) {
    next(new Error('AuditLog entries cannot be modified'));
});

// Static method to create audit log properly
auditLogSchema.statics.createLog = async function(logData) {
    const log = new this(logData);
    return await log.save();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
