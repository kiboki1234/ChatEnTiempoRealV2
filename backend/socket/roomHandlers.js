const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');
const roomController = require('../controllers/roomController');
const UserService = require('../services/userService');
const { getRealIP, generateDeviceFingerprint, emitRoomUpdate, emitUserActivity, roomToObject } = require('./helpers');
const { canUserJoin, createOrUpdateSession } = require('./sessionManager');
const logger = require('../utils/logger');

const socketRooms = new Map();

// Join room handler
const handleJoinRoom = (io) => async (socket, { pin, username }) => {
    try {
        const ipAddress = getRealIP(socket);
        const deviceFingerprint = await generateDeviceFingerprint(socket);

        // ✅ VALIDACIÓN DE SESIÓN ÚNICA
        const sessionCheck = await canUserJoin(username, ipAddress, deviceFingerprint, socket.id);
        if (!sessionCheck.allowed) {
            socket.emit('sessionError', { message: sessionCheck.reason });
            return;
        }

        // If replacing guest session, close it
        if (sessionCheck.replacedGuest) {
            const guestSocket = io.sockets.sockets.get(sessionCheck.guestSocketId);
            if (guestSocket) {
                logger.info('Registered user replacing guest session', { 
                    username, 
                    guestUser: sessionCheck.guestUsername, 
                    ipAddress 
                });
                guestSocket.emit('replacedByRegisteredUser', {
                    message: 'Tu sesión de invitado fue reemplazada por un usuario registrado'
                });
                guestSocket.disconnect();
            }
        }

        const previousRoom = socketRooms.get(socket.id);
        if (previousRoom && previousRoom !== pin) {
            await handleLeaveRoom(io)(socket);
        }

        const room = await roomController.getRoomByPin(pin);
        if (!room) {
            socket.emit('roomError', { message: 'Sala no encontrada' });
            return;
        }

        const result = await roomController.addParticipant(pin, socket.id, username, ipAddress, deviceFingerprint);
        
        if (!result.success) {
            socket.emit('roomError', { message: result.message });
            return;
        }

        socket.join(pin);
        socketRooms.set(socket.id, pin);

        // Create/update session
        await createOrUpdateSession(socket, username, ipAddress, deviceFingerprint);

        const roomObject = roomToObject(result.room);
        socket.emit('roomJoined', roomObject);
        socket.to(pin).emit('userJoined', { 
            username, 
            room: roomObject,
            participants: result.room.participants 
        });

        emitRoomUpdate(io, result.room);
        emitUserActivity(io, 'joined', username, pin);

        logger.info('User joined room', { username, pin, socketId: socket.id });
    } catch (error) {
        logger.error('Error in joinRoom', { error: error.message, pin });
        socket.emit('roomError', { message: error.message });
    }
};

// Leave room handler
const handleLeaveRoom = (io) => async (socket) => {
    try {
        const roomPin = socketRooms.get(socket.id);
        if (roomPin) {
            socket.leave(roomPin);
            await roomController.removeParticipant(socket.id);
            socketRooms.delete(socket.id);
            
            const room = await roomController.getRoomByPin(roomPin);
            if (room) {
                emitRoomUpdate(io, room);
                // Notify remaining users that someone left
                io.to(roomPin).emit('userLeft', { 
                    participants: room.participants 
                });
            }
            
            // Notify the user who left
            socket.emit('roomLeft');
        }
    } catch (error) {
        logger.error('Error leaving room', { error: error.message });
    }
};

// Create room handler
const handleCreateRoom = (io) => async (socket, { name, maxParticipants, type, username }) => {
    try {
        const ipAddress = getRealIP(socket);

        // Check if user can create room
        const permission = await UserService.canUserCreateRoom(username);
        if (!permission.allowed) {
            socket.emit('roomCreationError', { 
                message: permission.reason,
                limit: permission.limit,
                current: permission.current,
                cooldownEnds: permission.cooldownEnds
            });
            return;
        }

        // Create room
        const room = await roomController.createRoom(
            name,
            maxParticipants || 10,
            type || 'text',
            null,
            null,
            username
        );

        // Register room creation with user
        await UserService.registerRoomCreation(username, room._id, room.pin);

        // Log room creation
        await AuditLog.create({
            action: 'CREATE_ROOM',
            username,
            ipAddress,
            roomPin: room.pin,
            details: {
                roomName: name,
                maxParticipants,
                type
            }
        });

        const roomObject = roomToObject(room);
        socket.emit('roomCreated', roomObject);
        io.emit('roomListUpdated', { action: 'created', room: roomObject });

        logger.info('Room created', { roomName: name, pin: room.pin, username });
    } catch (error) {
        logger.error('Error creating room', { error: error.message });
        socket.emit('roomCreationError', { 
            message: error.message || 'Error al crear la sala' 
        });
    }
};

// Close room handler
const handleCloseRoom = (io) => async (socket, { pin, username }) => {
    try {
        const result = await roomController.deleteRoom(pin, socket.id);

        if (!result.success) {
            socket.emit('roomError', { message: result.message });
            return;
        }

        // Remove room from user's active rooms
        await UserService.removeUserRoom(username, pin);

        // Notify all users in the room
        io.to(pin).emit('roomClosed', {
            message: 'La sala ha sido cerrada por el administrador',
            pin
        });

        // Disconnect all users from the room
        const socketsInRoom = await io.in(pin).fetchSockets();
        for (const s of socketsInRoom) {
            s.leave(pin);
            socketRooms.delete(s.id);
        }

        socket.emit('roomClosedSuccess', { message: 'Sala cerrada exitosamente' });
        io.emit('roomListUpdated', { action: 'deleted', pin });

        logger.info('Room closed', { pin, username });
    } catch (error) {
        logger.error('Error closing room', { error: error.message, pin });
        socket.emit('roomError', { 
            message: 'Error al cerrar la sala' 
        });
    }
};

// Get room list
const getRoomList = () => {
    return socketRooms;
};

module.exports = {
    handleJoinRoom,
    handleLeaveRoom,
    handleCreateRoom,
    handleCloseRoom,
    getRoomList
};
