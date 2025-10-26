const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    socketId: {
        type: String,
        required: true,
        unique: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    deviceFingerprint: {
        type: String,
        required: true
    },
    roomPin: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
});

// Create compound index for efficient queries
// ✅ Índice principal: buscar sesiones activas por IP (nueva lógica: 1 cuenta por IP)
sessionSchema.index({ ipAddress: 1, isActive: 1 });
// ✅ Índice secundario: buscar por username + IP + estado
sessionSchema.index({ username: 1, ipAddress: 1, isActive: 1 });
// ✅ Índice para limpieza automática de sesiones expiradas
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Nota: socketId ya tiene índice único automático por 'unique: true' en el schema

module.exports = mongoose.model('Session', sessionSchema);
