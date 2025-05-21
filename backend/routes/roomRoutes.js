const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.find().select('pin name maxParticipants participants');
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Error getting rooms' });
    }
});

// Get room by PIN
router.get('/:pin', async (req, res) => {
    try {
        const room = await Room.findOne({ pin: req.params.pin });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ error: 'Error getting room' });
    }
});

// Create a new room
router.post('/', async (req, res) => {
    try {
        const { name, maxParticipants } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Room name is required' });
        }
        
        const roomController = require('../controllers/roomController');
        const room = await roomController.createRoom(name, maxParticipants || 5);
        
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ error: 'Error creating room' });
    }
});

module.exports = router;