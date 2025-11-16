const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        default: () => {
            // Generate encrypted unique ID
            const id = uuidv4();
            const key = process.env.ROOM_ENCRYPTION_KEY || 'default-32-char-key-change-me!';
            const iv = process.env.ROOM_ENCRYPTION_IV || '1234567890123456';
            
            // Ensure key is exactly 32 bytes for AES-256
            const keyBuffer = Buffer.alloc(32);
            Buffer.from(key).copy(keyBuffer);
            
            // Ensure IV is exactly 16 bytes
            const ivBuffer = Buffer.alloc(16);
            Buffer.from(iv).copy(ivBuffer);
            
            const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
            let encrypted = cipher.update(id, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted.substring(0, 16);
        }
    },
    pin: {
        type: String,
        required: true,
        unique: true
    },
    pinHash: {
        type: String,
        required: false  // Will be generated automatically by pre-validate hook
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    type: {
        type: String,
        enum: ['text', 'multimedia'],
        default: 'text',
        required: true
    },
    maxParticipants: {
        type: Number,
        required: true,
        min: 2,
        default: 10
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdByUsername: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
    encryptionKey: {
        type: String,
        required: false, // Optional for backward compatibility with old rooms
        select: false // Don't return by default in queries for security
    },
    participants: [{
        socketId: String,
        username: String,
        joinedAt: {
            type: Date,
            default: Date.now
        },
        ipAddress: String,
        deviceFingerprint: String
    }],
    encryptionKey: {
        type: String,
        default: () => crypto.randomBytes(32).toString('hex')
    }
});

// Hash PIN before validation (ensures pinHash is set before required check)
roomSchema.pre('validate', async function(next) {
    // Generate pinHash if it's a new document or PIN was modified
    if ((this.isNew || this.isModified('pin')) && this.pin && !this.pinHash) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.pinHash = await bcrypt.hash(this.pin, salt);
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Method to compare PINs
roomSchema.methods.comparePin = async function(candidatePin) {
    return await bcrypt.compare(candidatePin, this.pinHash);
};

// Method to check if room is expired
roomSchema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
};

module.exports = mongoose.model('Room', roomSchema);