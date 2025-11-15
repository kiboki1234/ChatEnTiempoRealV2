const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const roomController = require('../controllers/roomController');
const { authenticateAdmin, requireAdmin } = require('../middlewares/authMiddleware');
const { validateRoomCreation, validateRoomPin } = require('../middlewares/validationMiddleware');
const { roomCreationLimiter } = require('../middlewares/rateLimitMiddleware');
const AuditLog = require('../models/AuditLog');

// Get all rooms (public)
router.get('/', roomController.getAllRooms);

// Get room by PIN (requires PIN verification)
router.post('/verify', validateRoomPin, async (req, res) => {
    try {
        const { pin, providedPin } = req.body;
        
        const result = await roomController.verifyRoomPin(pin, providedPin);
        
        if (!result.valid) {
            return res.status(401).json({ error: result.message });
        }
        
        res.status(200).json({
            success: true,
            room: {
                roomId: result.room.roomId,
                pin: result.room.pin,
                name: result.room.name,
                type: result.room.type,
                maxParticipants: result.room.maxParticipants,
                participantCount: result.room.participants.length
            }
        });
    } catch (error) {
        console.error('Error verifying room:', error);
        res.status(500).json({ error: 'Error verifying room' });
    }
});

// Get room info without PIN verification (limited info)
router.get('/:pin', async (req, res) => {
    try {
        const room = await roomController.getRoomByPin(req.params.pin);
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        // Return limited information
        res.status(200).json({
            roomId: room.roomId,
            name: room.name,
            type: room.type,
            participantCount: room.participants.length,
            maxParticipants: room.maxParticipants,
            isFull: room.participants.length >= room.maxParticipants,
            requiresPin: true
        });
    } catch (error) {
        console.error('Error getting room:', error);
        res.status(500).json({ error: 'Error getting room' });
    }
});

// Create a new room (admin only)
router.post('/', authenticateAdmin, requireAdmin, roomCreationLimiter, validateRoomCreation, async (req, res) => {
    try {
        const { name, maxParticipants, type, expiresIn } = req.body;
        
        const room = await roomController.createRoom(
            name,
            maxParticipants || 10,
            type || 'text',
            req.adminId,
            expiresIn
        );
        
        // Create audit log
        await AuditLog.create({
            action: 'CREATE_ROOM',
            userId: req.adminId,
            username: req.username,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            roomPin: room.pin,
            details: {
                roomName: room.name,
                roomType: room.type,
                maxParticipants: room.maxParticipants,
                expiresAt: room.expiresAt
            }
        });
        
        res.status(201).json({
            success: true,
            room: {
                roomId: room.roomId,
                pin: room.pin,
                name: room.name,
                type: room.type,
                maxParticipants: room.maxParticipants,
                createdAt: room.createdAt,
                expiresAt: room.expiresAt
            }
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Error creating room' });
    }
});

// Delete a room (admin only)
router.delete('/:pin', authenticateAdmin, requireAdmin, async (req, res) => {
    try {
        const result = await roomController.deleteRoom(req.params.pin, req.adminId);
        
        if (!result.success) {
            return res.status(404).json({ error: result.message });
        }
        
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Error deleting room' });
    }
});

// Get room statistics (admin only)
router.get('/stats/all', authenticateAdmin, requireAdmin, async (req, res) => {
    try {
        const rooms = await Room.find({ isActive: true });
        
        const stats = {
            totalRooms: rooms.length,
            totalParticipants: rooms.reduce((sum, room) => sum + room.participants.length, 0),
            roomsByType: {
                text: rooms.filter(r => r.type === 'text').length,
                multimedia: rooms.filter(r => r.type === 'multimedia').length
            },
            averageParticipants: rooms.length > 0 
                ? (rooms.reduce((sum, room) => sum + room.participants.length, 0) / rooms.length).toFixed(2)
                : 0
        };
        
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting room stats:', error);
        res.status(500).json({ error: 'Error getting room statistics' });
    }
});

module.exports = router;