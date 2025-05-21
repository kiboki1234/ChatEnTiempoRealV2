const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: String,
    message: String,
    sticker: String,
    imageUrl: String,
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