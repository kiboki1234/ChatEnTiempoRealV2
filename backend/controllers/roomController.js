const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');
const encryptionService = require('../services/encryptionService');
const { roomWorkerPool } = require('../services/workerPool');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../utils/errorHandler');

// Create a new room
const createRoom = async (name, maxParticipants = 10, type = 'text', adminId = null, expiresIn = null, username = null) => {
    try {
        // Use worker thread to generate room data in parallel
        const roomDataResult = await roomWorkerPool.executeTask({
            operation: 'generateRoomData',
            data: {
                name: name,
                expiresIn: expiresIn
            }
        });
        
        if (!roomDataResult.success) {
            throw new AppError(roomDataResult.error, 500);
        }
        
        const { pin, roomId, encryptionKey, expiresAt } = roomDataResult.result;
    
    // Verify PIN is unique
    let uniquePin = pin;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        const existingRoom = await Room.findOne({ pin: uniquePin });
        if (!existingRoom) {
            break;
        }
        // Generate new PIN if collision detected
        const newPinResult = await roomWorkerPool.executeTask({
            operation: 'generatePin',
            data: {}
        });
        uniquePin = newPinResult.result;
        attempts++;
    }
    
    if (attempts >= maxAttempts) {
        throw new AppError('Failed to generate unique PIN after multiple attempts', 500);
    }
    
    const room = new Room({
        pin: uniquePin,
        name,
        type,
        maxParticipants: Math.max(2, maxParticipants),
        createdBy: adminId,
        createdByUsername: username || 'system',
        expiresAt,
        encryptionKey // Store for sharing with new joiners
    });
    
        await room.save();
        
        // Verify room was saved
        const savedRoom = await Room.findOne({ pin: uniquePin });
        if (!savedRoom) {
            throw new AppError('Room was not saved to database', 500);
        }
        
        // DO NOT store encryption key on server for E2E encryption
        // The key will be sent to the client and shared via secure channel
        // encryptionService.setRoomKey(uniquePin, Buffer.from(encryptionKey, 'hex'));
        
        logger.info('Room created and saved', { 
            name, 
            pin: uniquePin, 
            roomId: room.roomId,
            _id: room._id,
            type, 
            maxParticipants,
            isActive: room.isActive,
            e2ee: true // End-to-end encryption enabled
        });
        
        // Return room with encryption key for client-side E2E encryption
        return {
            ...room.toObject(),
            encryptionKey // Send key to client, don't store on server
        };
    } catch (error) {
        logger.error('Error creating room', { error: error.message, name });
        throw error;
    }
};

// Get a room by PIN
const getRoomByPin = async (pin, includeEncryptionKey = false) => {
    try {
        let query = Room.findOne({ pin, isActive: true });
        
        // Include encryption key if requested (for sharing with joiners)
        if (includeEncryptionKey) {
            query = query.select('+encryptionKey');
        }
        
        const room = await query;
        
        if (!room) {
            return null;
        }
        
        // Check if room is expired
        if (room.isExpired()) {
            room.isActive = false;
            await room.save();
            logger.info('Room expired', { pin });
            return null;
        }
        
        return room;
    } catch (error) {
        logger.error('Error getting room by PIN', { error: error.message, pin });
        throw error;
    }
};

// Verify room PIN
const verifyRoomPin = asyncHandler(async (pin, providedPin) => {
    const room = await Room.findOne({ pin, isActive: true });
    
    if (!room) {
        return { valid: false, message: 'Room not found' };
    }
    
    if (room.isExpired()) {
        room.isActive = false;
        await room.save();
        logger.info('Room expired during PIN verification', { pin });
        return { valid: false, message: 'Room has expired' };
    }
    
    const isValid = await room.comparePin(providedPin);
    
    if (!isValid) {
        logger.warn('Invalid PIN attempt', { pin });
    }
    
    return {
        valid: isValid,
        message: isValid ? 'PIN verified' : 'Invalid PIN',
        room: isValid ? room : null
    };
});

// Add a participant to a room
const addParticipant = async (pin, socketId, username, ipAddress, deviceFingerprint) => {
    try {
        // Validate participant data using worker thread
        const validationResult = await roomWorkerPool.executeTask({
            operation: 'validateParticipant',
            data: {
                username: username,
                ipAddress: ipAddress
            }
        });
        
        if (!validationResult.success || !validationResult.result.valid) {
            return { 
                success: false, 
                message: validationResult.result.errors.join(', ') 
            };
        }
    
    const room = await Room.findOne({ pin, isActive: true });
    
    if (!room) {
        return { success: false, message: 'Room not found' };
    }
    
    if (room.isExpired()) {
        room.isActive = false;
        await room.save();
        logger.info('Room expired when adding participant', { pin });
        return { success: false, message: 'Room has expired' };
    }
    
    if (room.participants.length >= room.maxParticipants) {
        logger.warn('Room full', { pin, username });
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
        logger.info('Participant updated', { username, pin });
    } else {
        // Add new participant
        room.participants.push({
            socketId,
            username,
            ipAddress,
            deviceFingerprint,
            joinedAt: new Date()
        });
        logger.info('Participant added', { username, pin });
    }
    
        await room.save();
        return { success: true, room };
    } catch (error) {
        logger.error('Error adding participant', { error: error.message, pin, username });
        return { success: false, message: error.message };
    }
};

// Remove a participant from a room
const removeParticipant = async (socketId) => {
    try {
        const rooms = await Room.find({ 'participants.socketId': socketId });
        
        for (const room of rooms) {
            room.participants = room.participants.filter(p => p.socketId !== socketId);
            await room.save();
            logger.info('Participant removed', { socketId, roomPin: room.pin });
        }
        
        return true;
    } catch (error) {
        logger.error('Error removing participant', { error: error.message, socketId });
        throw error;
    }
};

// Get all active rooms
const getAllRooms = asyncHandler(async (req, res) => {
    logger.info('Getting all active rooms');
    
    const rooms = await Room.find({ isActive: true })
        .select('roomId pin name type maxParticipants participants createdAt expiresAt createdByUsername')
        .lean();
    
    logger.info('Rooms found in database', { count: rooms.length });
    
    // Filter out expired rooms
    const activeRooms = rooms.filter(room => {
        if (!room.expiresAt) return true;
        return new Date() < new Date(room.expiresAt);
    });
    
    logger.info('Active rooms after filtering', { count: activeRooms.length });
    
    // Return rooms with PIN visible for users to join
    const result = activeRooms.map(room => ({
        roomId: room.roomId,
        pin: room.pin, // PIN visible para que los usuarios puedan unirse
        name: room.name,
        type: room.type,
        participantCount: room.participants?.length || 0,
        maxParticipants: room.maxParticipants,
        isFull: (room.participants?.length || 0) >= room.maxParticipants,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        createdByUsername: room.createdByUsername,
        participants: room.participants || [] // Incluir participantes para la UI
    }));
    
    logger.info('Returning rooms', { count: result.length });
    res.status(200).json(result);
});

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
    
        logger.info('Room deleted', { pin, roomName: room.name, adminId });
        
        return { success: true, message: 'Room deleted successfully' };
    } catch (error) {
        logger.error('Error deleting room', { error: error.message, pin });
        return { success: false, message: error.message };
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
        
        logger.info('Expired rooms cleaned up', { count: expiredRooms.length });
        return expiredRooms.length;
    } catch (error) {
        logger.error('Error cleaning up expired rooms', { error: error.message });
        return 0;
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