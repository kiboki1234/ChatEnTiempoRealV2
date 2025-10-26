const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');
const encryptionService = require('../services/encryptionService');

// Generate a random 6-digit PIN
const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create a new room
const createRoom = async (name, maxParticipants = 10, type = 'text', adminId = null, expiresIn = null, username = null) => {
    try {
        let pin;
        let roomExists = true;
        
        // Generate a unique PIN
        while (roomExists) {
            pin = generatePin();
            const existingRoom = await Room.findOne({ pin });
            if (!existingRoom) {
                roomExists = false;
            }
        }
        
        // Calculate expiration date if provided
        let expiresAt = null;
        if (expiresIn) {
            expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000); // hours to milliseconds
        }
        
        const room = new Room({
            pin,
            name,
            type,
            maxParticipants: Math.max(2, maxParticipants),
            createdBy: adminId,
            createdByUsername: username || 'system',
            expiresAt
        });
        
        await room.save();
        
        // Generate ephemeral encryption key for the room
        encryptionService.generateRoomKey(pin);
        
        return room;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
};

// Get a room by PIN
const getRoomByPin = async (pin) => {
    try {
        const room = await Room.findOne({ pin, isActive: true });
        
        if (!room) {
            return null;
        }
        
        // Check if room is expired
        if (room.isExpired()) {
            room.isActive = false;
            await room.save();
            return null;
        }
        
        return room;
    } catch (error) {
        console.error('Error getting room:', error);
        throw error;
    }
};

// Verify room PIN
const verifyRoomPin = async (pin, providedPin) => {
    try {
        const room = await Room.findOne({ pin, isActive: true });
        
        if (!room) {
            return { valid: false, message: 'Room not found' };
        }
        
        if (room.isExpired()) {
            room.isActive = false;
            await room.save();
            return { valid: false, message: 'Room has expired' };
        }
        
        const isValid = await room.comparePin(providedPin);
        
        return {
            valid: isValid,
            message: isValid ? 'PIN verified' : 'Invalid PIN',
            room: isValid ? room : null
        };
    } catch (error) {
        console.error('Error verifying PIN:', error);
        throw error;
    }
};

// Add a participant to a room
const addParticipant = async (pin, socketId, username, ipAddress, deviceFingerprint) => {
    try {
        const room = await Room.findOne({ pin, isActive: true });
        
        if (!room) {
            return { success: false, message: 'Room not found' };
        }
        
        if (room.isExpired()) {
            room.isActive = false;
            await room.save();
            return { success: false, message: 'Room has expired' };
        }
        
        if (room.participants.length >= room.maxParticipants) {
            return { success: false, message: 'Room is full' };
        }
        
        // Check if user already has an active session in this room
        const existingParticipant = room.participants.find(
            p => p.username === username || 
                 (p.ipAddress === ipAddress && p.deviceFingerprint === deviceFingerprint)
        );
        
        if (existingParticipant) {
            // Update existing participant
            existingParticipant.socketId = socketId;
            existingParticipant.joinedAt = new Date();
        } else {
            // Add new participant
            room.participants.push({
                socketId,
                username,
                ipAddress,
                deviceFingerprint,
                joinedAt: new Date()
            });
        }
        
        await room.save();
        return { success: true, room };
    } catch (error) {
        console.error('Error adding participant:', error);
        throw error;
    }
};

// Remove a participant from a room
const removeParticipant = async (socketId) => {
    try {
        const rooms = await Room.find({ 'participants.socketId': socketId });
        
        for (const room of rooms) {
            room.participants = room.participants.filter(p => p.socketId !== socketId);
            await room.save();
        }
        
        return true;
    } catch (error) {
        console.error('Error removing participant:', error);
        throw error;
    }
};

// Get all active rooms
const getAllRooms = async () => {
    try {
        const rooms = await Room.find({ isActive: true })
            .select('roomId pin name type maxParticipants participants createdAt expiresAt')
            .lean();
        
        // Filter out expired rooms
        const activeRooms = rooms.filter(room => {
            if (!room.expiresAt) return true;
            return new Date() < new Date(room.expiresAt);
        });
        
        // Return rooms without sensitive info
        return activeRooms.map(room => ({
            roomId: room.roomId,
            name: room.name,
            type: room.type,
            participantCount: room.participants.length,
            maxParticipants: room.maxParticipants,
            isFull: room.participants.length >= room.maxParticipants,
            createdAt: room.createdAt,
            expiresAt: room.expiresAt
        }));
    } catch (error) {
        console.error('Error getting rooms:', error);
        throw error;
    }
};

// Delete a room (admin only)
const deleteRoom = async (pin, adminId) => {
    try {
        const room = await Room.findOne({ pin });
        
        if (!room) {
            return { success: false, message: 'Room not found' };
        }
        
        // Clear room encryption key
        encryptionService.clearRoomKey(pin);
        
        // Soft delete
        room.isActive = false;
        await room.save();
        
        // Log the action
        await AuditLog.create({
            action: 'DELETE_ROOM',
            userId: adminId,
            username: 'admin',
            ipAddress: 'system',
            roomPin: pin,
            details: {
                roomName: room.name,
                participantCount: room.participants.length
            }
        });
        
        return { success: true, message: 'Room deleted successfully' };
    } catch (error) {
        console.error('Error deleting room:', error);
        throw error;
    }
};

// Clean up expired rooms (scheduled task)
const cleanupExpiredRooms = async () => {
    try {
        const expiredRooms = await Room.find({
            isActive: true,
            expiresAt: { $lt: new Date() }
        });
        
        for (const room of expiredRooms) {
            room.isActive = false;
            await room.save();
            
            // Clear encryption key
            encryptionService.clearRoomKey(room.pin);
        }
        
        console.log(`Cleaned up ${expiredRooms.length} expired rooms`);
        return expiredRooms.length;
    } catch (error) {
        console.error('Error cleaning up expired rooms:', error);
        throw error;
    }
};

module.exports = {
    createRoom,
    getRoomByPin,
    verifyRoomPin,
    addParticipant,
    removeParticipant,
    getAllRooms,
    deleteRoom,
    cleanupExpiredRooms
};