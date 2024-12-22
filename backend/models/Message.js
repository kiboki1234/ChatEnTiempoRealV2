const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: String,
    message: String,
    sticker: String,
    imageUrl: String, // Nuevo campo para imágenes
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