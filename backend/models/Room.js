const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    pin: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    maxParticipants: {
        type: Number,
        required: true,
        default: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    participants: [{
        socketId: String,
        username: String
    }]
});

module.exports = mongoose.model('Room', roomSchema);