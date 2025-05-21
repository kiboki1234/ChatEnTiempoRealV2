const Room = require('../models/Room');

// Generate a random 6-digit PIN
const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create a new room
const createRoom = async (name, maxParticipants = 5) => {
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
        
        const room = new Room({
            pin,
            name,
            maxParticipants
        });
        
        await room.save();
        return room;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
};

// Get a room by PIN
const getRoomByPin = async (pin) => {
    try {
        return await Room.findOne({ pin });
    } catch (error) {
        console.error('Error getting room:', error);
        throw error;
    }
};

// Add a participant to a room
const addParticipant = async (pin, socketId, username) => {
    try {
        const room = await Room.findOne({ pin });
        if (!room) {
            return { success: false, message: 'Room not found' };
        }
        
        if (room.participants.length >= room.maxParticipants) {
            return { success: false, message: 'Room is full' };
        }
        
        // Check if user is already in the room
        const existingParticipant = room.participants.find(p => p.username === username);
        if (existingParticipant) {
            return { success: false, message: 'You are already in this room' };
        }
        
        room.participants.push({ socketId, username });
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

// Get all rooms
const getAllRooms = async () => {
    try {
        return await Room.find().select('pin name maxParticipants participants');
    } catch (error) {
        console.error('Error getting rooms:', error);
        throw error;
    }
};

module.exports = {
    createRoom,
    getRoomByPin,
    addParticipant,
    removeParticipant,
    getAllRooms
};