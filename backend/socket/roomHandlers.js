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

        // Get room with encryption key for E2E encryption
        const room = await roomController.getRoomByPin(pin, true);
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
        
        // Send room with encryption key to joiner (for E2E encryption)
        socket.emit('roomJoined', {
            ...roomObject,
            encryptionKey: room.encryptionKey // Share encryption key with new joiner
        });
        
        // Notify ALL users in the room (including the one who joined) about the updated participant list
        // Include encryption key so all participants can decrypt messages
        io.to(pin).emit('userJoined', { 
            username, 
            room: {
                ...roomObject,
                encryptionKey: room.encryptionKey // Share encryption key with all participants
            },
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
            // Get room BEFORE removing participant to know who left
            const roomBefore = await roomController.getRoomByPin(roomPin);
            const leavingUser = roomBefore?.participants.find(p => p.socketId === socket.id);
            
            socket.leave(roomPin);
            await roomController.removeParticipant(socket.id);
            socketRooms.delete(socket.id);
            
            const room = await roomController.getRoomByPin(roomPin);
            if (room) {
                const roomObject = roomToObject(room);
                
                // Notify remaining users that someone left with updated participants
                io.to(roomPin).emit('userLeft', { 
                    username: leavingUser?.username,
                    room: roomObject,
                    participants: room.participants 
                });
                
                emitRoomUpdate(io, room);
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
        
        logger.info('Room created successfully', { 
            roomName: name, 
            pin: room.pin, 
            roomId: room.roomId,
            _id: room._id,
            username,
            isActive: room.isActive,
            participantCount: room.participants?.length || 0,
            e2ee: true
        });
        
        // Send room with encryption key to creator (for E2E encryption)
        socket.emit('roomCreated', {
            ...roomObject,
            encryptionKey: room.encryptionKey // Include encryption key for client
        });
        
        // Send room list update WITHOUT encryption key (public info only)
        io.emit('roomListUpdated', { action: 'created', room: roomObject });
        
        logger.info('Room events emitted', { pin: room.pin });
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
        // Get room before deleting to obtain roomId
        const room = await roomController.getRoomByPin(pin);
        if (!room) {
            socket.emit('roomError', { message: 'Sala no encontrada' });
            return;
        }

        const result = await roomController.deleteRoom(pin, socket.id);

        if (!result.success) {
            socket.emit('roomError', { message: result.message });
            return;
        }

        // Remove room from user's active rooms - CRITICAL: pass room._id not pin
        await UserService.removeUserRoom(username, room._id);

        // IMPORTANT: Emit updates BEFORE disconnecting users
        // 1. Notify all users in the room that it's being closed
        io.to(pin).emit('roomClosed', {
            message: 'La sala ha sido cerrada por el administrador',
            pin
        });

        // 2. Notify ALL users (including those not in room) that room list updated
        io.emit('roomListUpdated', { action: 'deleted', pin });

        // 3. Notify the creator that room was closed successfully
        socket.emit('roomClosedSuccess', { message: 'Sala cerrada exitosamente' });

        // 4. NOW disconnect all users from the room
        const socketsInRoom = await io.in(pin).fetchSockets();
        for (const s of socketsInRoom) {
            s.leave(pin);
            socketRooms.delete(s.id);
        }

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
