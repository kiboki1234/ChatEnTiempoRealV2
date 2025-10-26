const { Server } = require('socket.io');
const Room = require('./models/Room');
const Session = require('./models/Session');
const AuditLog = require('./models/AuditLog');
const { createMessage } = require('./controllers/chatController');
const roomController = require('./controllers/roomController');
const encryptionService = require('./services/encryptionService');
const UserService = require('./services/userService');
const crypto = require('crypto');

const socketRooms = new Map();
const activeSessions = new Map(); // Track active sessions

module.exports = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'https://chat-en-tiempo-real-v2.vercel.app',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 10000,
        pingInterval: 25000,
        cookie: false
    });

    const emitRoomUpdate = (room) => {
        io.emit('roomUpdated', {
            pin: room.pin,
            participantCount: room.participants.length,
            maxParticipants: room.maxParticipants
        });
    };

    const emitUserActivity = (type, username, room, extra = {}) => {
        io.emit('userActivity', {
            type,
            username,
            room,
            timestamp: new Date(),
            ...extra
        });
    };

    // Helper function to safely convert room to plain object
    const roomToObject = (room) => {
        // If it's already a plain object or doesn't have toObject method, return as is
        if (typeof room.toObject === 'function') {
            return room.toObject();
        }
        return room;
    };

    // Generate device fingerprint from socket handshake
    const generateDeviceFingerprint = (socket) => {
        const data = {
            userAgent: socket.handshake.headers['user-agent'],
            language: socket.handshake.headers['accept-language'],
            encoding: socket.handshake.headers['accept-encoding']
        };
        
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex')
            .substring(0, 32);
    };

    // Check if user can join (single session per device)
    const canUserJoin = async (username, ipAddress, deviceFingerprint, socketId) => {
        try {
            // Check for existing active session
            const existingSession = await Session.findOne({
                username,
                isActive: true,
                socketId: { $ne: socketId }
            });

            if (existingSession) {
                // Check if it's the same device
                if (existingSession.ipAddress === ipAddress && 
                    existingSession.deviceFingerprint === deviceFingerprint) {
                    // Same device, allow reconnection
                    existingSession.isActive = false;
                    await existingSession.save();
                    return { allowed: true };
                }
                
                return {
                    allowed: false,
                    reason: 'You already have an active session on another device'
                };
            }

            return { allowed: true };
        } catch (error) {
            console.error('Error checking user session:', error);
            return { allowed: true }; // Allow in case of error
        }
    };

    const joinRoom = async (socket, pin, username) => {
        const ipAddress = socket.handshake.address;
        const deviceFingerprint = generateDeviceFingerprint(socket);

        if (pin === 'general') {
            socket.join('general');
            
            // Create or update session
            const session = await Session.findOneAndUpdate(
                { socketId: socket.id },
                {
                    userId: socket.id,
                    username,
                    socketId: socket.id,
                    ipAddress,
                    deviceFingerprint,
                    roomPin: 'general'
                },
                { upsert: true, new: true }
            );
            activeSessions.set(socket.id, session);

            return {
                pin: 'general',
                name: 'Chat General',
                participants: [],
                maxParticipants: Infinity
            };
        }

        const room = await Room.findOne({ pin, isActive: true });
        if (!room) throw new Error('Sala no encontrada o inactiva');

        // Check if room is expired
        if (room.isExpired()) {
            room.isActive = false;
            await room.save();
            throw new Error('La sala ha expirado');
        }

        // Check single session
        const sessionCheck = await canUserJoin(username, ipAddress, deviceFingerprint, socket.id);
        if (!sessionCheck.allowed) {
            throw new Error(sessionCheck.reason);
        }

        const alreadyInRoom = room.participants.some(p => p.username === username);
        
        // Check if room is full
        if (room.participants.length >= room.maxParticipants && !alreadyInRoom) {
            throw new Error('La sala está llena');
        }

        // Remove previous participant entry if exists
        await Room.updateOne(
            { pin },
            { $pull: { participants: { username } } }
        );

        // Add participant with full info
        const updatedRoom = await Room.findOneAndUpdate(
            { pin },
            { 
                $addToSet: { 
                    participants: { 
                        socketId: socket.id, 
                        username,
                        ipAddress,
                        deviceFingerprint,
                        joinedAt: new Date()
                    } 
                } 
            },
            { new: true }
        );

        // Create or update session record
        const session = await Session.findOneAndUpdate(
            { socketId: socket.id },
            {
                userId: socket.id,
                username,
                socketId: socket.id,
                ipAddress,
                deviceFingerprint,
                roomPin: pin
            },
            { upsert: true, new: true }
        );
        activeSessions.set(socket.id, session);

        socketRooms.set(socket.id, pin);

        // Log join action
        await AuditLog.create({
            action: 'JOIN_ROOM',
            userId: socket.id,
            username,
            ipAddress,
            userAgent: socket.handshake.headers['user-agent'],
            roomPin: pin,
            details: {
                roomName: updatedRoom.name,
                roomType: updatedRoom.type
            }
        });

        return updatedRoom;
    };

    const leaveRoom = async (socket) => {
        const pin = socket.roomPin;
        const username = socket.username;
        const ipAddress = socket.handshake.address;

        if (!pin) return;

        socket.leave(pin);

        // Deactivate session
        const session = activeSessions.get(socket.id);
        if (session) {
            session.isActive = false;
            await session.save();
            activeSessions.delete(socket.id);
        }

        if (pin === 'general') {
            emitUserActivity('left', username, 'general');
            
            // Log leave action
            await AuditLog.create({
                action: 'LEAVE_ROOM',
                userId: socket.id,
                username,
                ipAddress,
                roomPin: 'general',
                details: {}
            });
            
            return;
        }

        const updatedRoom = await Room.findOneAndUpdate(
            { pin },
            { $pull: { participants: { socketId: socket.id } } },
            { new: true }
        );

        if (updatedRoom) {
            io.to(pin).emit('userLeft', {
                socketId: socket.id,
                username,
                participants: updatedRoom.participants,
                timestamp: new Date()
            });
            emitRoomUpdate(updatedRoom);

            // Log leave action
            await AuditLog.create({
                action: 'LEAVE_ROOM',
                userId: socket.id,
                username,
                ipAddress,
                roomPin: pin,
                details: {
                    roomName: updatedRoom.name
                }
            });
        }

        socketRooms.delete(socket.id);
    };

    io.on('connection', (socket) => {
        console.log('Conectado:', socket.id);

        socket.on('joinRoom', async ({ pin, username }) => {
            try {
                const previousRoom = socket.roomPin;

                if (previousRoom && previousRoom !== pin) {
                    await leaveRoom(socket);
                }

                const room = await joinRoom(socket, pin, username);
                socket.join(pin);
                socket.roomPin = pin;
                socket.username = username;

                // Send room encryption key to client (in production, use proper key exchange)
                const roomKey = encryptionService.getRoomKey(pin) || 
                               encryptionService.generateRoomKey(pin);

                socket.emit('roomJoined', {
                    ...roomToObject(room),
                    encryptionKey: roomKey.toString('hex')
                });

                if (pin !== 'general') {
                    io.to(pin).emit('userJoined', {
                        socketId: socket.id,
                        username,
                        participants: room.participants,
                        timestamp: new Date()
                    });
                    emitRoomUpdate(room);
                } else {
                    io.to('general').emit('userJoined', {
                        socketId: socket.id,
                        username,
                        timestamp: new Date()
                    });
                }

                emitUserActivity('roomChange', username, pin, { fromRoom: previousRoom || 'none' });

            } catch (error) {
                console.error('Error en joinRoom:', error);
                socket.emit('roomError', { message: error.message });
            }
        });

        socket.on('leaveRoom', async () => {
            try {
                if (socket.roomPin) {
                    await leaveRoom(socket);
                    socket.emit('roomLeft');
                }
            } catch (error) {
                socket.emit('roomError', { message: error.message });
            }
        });

        socket.on('sendMessage', async (data) => {
            try {
                const roomPin = data.roomPin || socketRooms.get(socket.id) || 'general';
                const ipAddress = socket.handshake.address;

                // Save message (already sanitized by worker if needed)
                const message = await createMessage({ ...data, roomPin });

                // Emit to room
                io.to(roomPin).emit('receiveMessage', message);

                // Log message
                await AuditLog.create({
                    action: 'SEND_MESSAGE',
                    userId: socket.id,
                    username: data.username,
                    ipAddress,
                    userAgent: socket.handshake.headers['user-agent'],
                    roomPin,
                    details: {
                        messageLength: data.message?.length || 0,
                        hasImage: !!data.imageUrl,
                        hasSticker: !!data.sticker
                    }
                });
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('messageError', { message: 'Error al enviar mensaje' });
            }
        });

        socket.on('createRoom', async ({ name, maxParticipants, type, username }) => {
            try {
                const ipAddress = socket.handshake.address;
                const deviceFingerprint = generateDeviceFingerprint(socket);
                
                // Check if user is a guest (guests cannot create rooms)
                if (username && username.startsWith('guest_')) {
                    socket.emit('roomError', { 
                        message: 'Los usuarios invitados no pueden crear salas. Por favor, regístrate para crear salas privadas.',
                        isGuestRestriction: true
                    });
                    return;
                }
                
                // Get or create user
                const user = await UserService.getOrCreateUser(username, ipAddress, deviceFingerprint);
                
                // Check if user can create a room
                const permission = user.canCreateRoom();
                
                if (!permission.allowed) {
                    socket.emit('roomError', { 
                        message: permission.reason,
                        details: {
                            currentCount: permission.currentCount,
                            maxAllowed: permission.maxAllowed,
                            resetIn: permission.resetIn
                        }
                    });
                    return;
                }
                
                // Create room
                const room = await roomController.createRoom(
                    name, 
                    maxParticipants || 10,
                    type || 'text',
                    user._id,
                    null,
                    username
                );
                
                // Register room creation
                await UserService.registerRoomCreation(username, room._id, room.pin);
                
                // Log room creation
                await AuditLog.createLog({
                    action: 'CREATE_ROOM',
                    userId: socket.id,
                    username: username,
                    ipAddress,
                    userAgent: socket.handshake.headers['user-agent'],
                    roomPin: room.pin,
                    details: {
                        roomName: room.name,
                        roomType: room.type,
                        maxParticipants: room.maxParticipants,
                        userRole: user.role,
                        remainingRooms: permission.remainingRooms,
                        remainingThisHour: permission.remainingThisHour
                    }
                });
                
                io.emit('roomCreated', room);
                socket.emit('roomCreated', { 
                    ...roomToObject(room), 
                    autoJoin: true,
                    userStats: {
                        remainingRooms: permission.remainingRooms,
                        remainingThisHour: permission.remainingThisHour
                    }
                });
            } catch (error) {
                console.error('Error creating room:', error);
                socket.emit('roomError', { 
                    message: error.message || 'Error al crear la sala' 
                });
            }
        });

        // Close/Delete room
        socket.on('closeRoom', async ({ pin, username }) => {
            try {
                const room = await Room.findOne({ pin, isActive: true });
                
                if (!room) {
                    socket.emit('roomError', { message: 'Sala no encontrada' });
                    return;
                }
                
                // Check if user is the creator or admin
                const user = await UserService.getOrCreateUser(
                    username, 
                    socket.handshake.address, 
                    generateDeviceFingerprint(socket)
                );
                
                const isCreator = room.createdByUsername === username;
                const isAdmin = user.role === 'admin';
                
                if (!isCreator && !isAdmin) {
                    socket.emit('roomError', { 
                        message: 'No tienes permisos para cerrar esta sala' 
                    });
                    return;
                }
                
                // Mark room as inactive
                room.isActive = false;
                await room.save();
                
                // Update user's active rooms
                await UserService.removeUserRoom(room.createdByUsername, room._id);
                
                // Notify all participants
                io.to(pin).emit('roomClosed', {
                    pin,
                    message: 'La sala ha sido cerrada',
                    closedBy: username
                });
                
                // Disconnect all participants from the room
                const sockets = await io.in(pin).fetchSockets();
                for (const s of sockets) {
                    s.leave(pin);
                }
                
                // Log room closure
                await AuditLog.create({
                    action: 'CLOSE_ROOM',
                    userId: socket.id,
                    username,
                    ipAddress: socket.handshake.address,
                    roomPin: pin,
                    details: {
                        roomName: room.name,
                        isCreator,
                        isAdmin
                    }
                });
                
                socket.emit('roomClosedSuccess', { 
                    message: 'Sala cerrada exitosamente' 
                });
                
            } catch (error) {
                console.error('Error closing room:', error);
                socket.emit('roomError', { 
                    message: 'Error al cerrar la sala' 
                });
            }
        });

        // Get user stats
        socket.on('getUserStats', async ({ username }) => {
            try {
                const stats = await UserService.getUserStats(username);
                socket.emit('userStats', stats);
            } catch (error) {
                console.error('Error getting user stats:', error);
                socket.emit('statsError', { 
                    message: 'Error al obtener estadísticas' 
                });
            }
        });

        // Get user's active rooms
        socket.on('getMyRooms', async ({ username }) => {
            try {
                const stats = await UserService.getUserStats(username);
                socket.emit('myRooms', {
                    activeRooms: stats.activeRooms,
                    totalCreated: stats.stats.totalRoomsCreated,
                    canCreateMore: stats.canCreateRoom,
                    details: stats.canCreateRoomDetails
                });
            } catch (error) {
                console.error('Error getting user rooms:', error);
                socket.emit('roomError', { 
                    message: 'Error al obtener tus salas' 
                });
            }
        });

        socket.on('disconnect', async () => {
            const pin = socket.roomPin || socketRooms.get(socket.id);
            const username = socket.username || 'Desconocido';
            const ipAddress = socket.handshake.address;

            // Deactivate session
            const session = activeSessions.get(socket.id);
            if (session) {
                session.isActive = false;
                await session.save();
                activeSessions.delete(socket.id);
            }

            if (!pin) return;

            if (pin === 'general') {
                io.to('general').emit('userDisconnected', {
                    socketId: socket.id,
                    username,
                    timestamp: new Date()
                });
            } else {
                const updatedRoom = await Room.findOneAndUpdate(
                    { pin },
                    { $pull: { participants: { socketId: socket.id } } },
                    { new: true }
                );

                if (updatedRoom) {
                    io.to(pin).emit('userLeft', {
                        socketId: socket.id,
                        username,
                        participants: updatedRoom.participants,
                        timestamp: new Date()
                    });
                    emitRoomUpdate(updatedRoom);
                }
            }

            // Log disconnect
            await AuditLog.create({
                action: 'LEAVE_ROOM',
                userId: socket.id,
                username,
                ipAddress,
                roomPin: pin,
                details: {
                    reason: 'disconnect'
                }
            });

            emitUserActivity('disconnected', username, pin);
            socketRooms.delete(socket.id);
        });

        // Heartbeat to keep sessions alive
        socket.on('heartbeat', async () => {
            const session = activeSessions.get(socket.id);
            if (session) {
                session.lastActivity = new Date();
                await session.save();
            }
        });
    });
};
