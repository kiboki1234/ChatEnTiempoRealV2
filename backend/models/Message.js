const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: String,
    message: String, // Plain text (placeholder for E2E encrypted messages)
    encryptedMessage: {
        ciphertext: String,
        nonce: String
    }, // E2E encrypted message data
    sticker: String,
    imageUrl: String,
    voiceUrl: String,
    voiceDuration: Number,
    roomPin: {
        type: String,
        default: 'general' // 'general' for the main chat
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    }
});

module.exports = mongoose.model('Message', messageSchema);