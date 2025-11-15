const { Server } = require('socket.io');
const Room = require('./models/Room');
const Session = require('./models/Session');
const AuditLog = require('./models/AuditLog');
const { createMessage } = require('./controllers/chatController');
const roomController = require('./controllers/roomController');
const encryptionService = require('./services/encryptionService');
const UserService = require('./services/userService');
const { messageWorkerPool, authWorkerPool } = require('./services/workerPool');
const crypto = require('crypto');
const logger = require('./utils/logger');

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

    // Get real IP address from socket, considering proxy headers
    const getRealIP = (socket) => {
        // Check for proxy headers first (most reliable in production)
        const forwardedFor = socket.handshake.headers['x-forwarded-for'];
        const realIP = socket.handshake.headers['x-real-ip'];
        const cfConnectingIP = socket.handshake.headers['cf-connecting-ip']; // Cloudflare
        
        // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2...)
        // The first one is the real client IP
        if (forwardedFor) {
            const ips = forwardedFor.split(',').map(ip => ip.trim());
            return normalizeIP(ips[0]);
        }
        
        // x-real-ip is set by some proxies
        if (realIP) {
            return normalizeIP(realIP);
        }
        
        // cf-connecting-ip is set by Cloudflare
        if (cfConnectingIP) {
            return normalizeIP(cfConnectingIP);
        }
        
        // Fallback to socket address (direct connection or local development)
        return normalizeIP(socket.handshake.address);
    };

    // Normalize IP address to handle IPv4/IPv6 variations
    const normalizeIP = (ip) => {
        if (!ip) return 'unknown';
        
        // Convert IPv6 localhost to standard format
        if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
            return 'localhost';
        }
        
        // Remove IPv6 prefix for IPv4-mapped addresses
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        
        return ip;
    };

    // Generate device fingerprint from socket handshake
    const generateDeviceFingerprint = async (socket) => {
        const data = {
            userAgent: socket.handshake.headers['user-agent'],
            language: socket.handshake.headers['accept-language'],
            encoding: socket.handshake.headers['accept-encoding']
        };
        
        // Use worker thread for fingerprint generation
        try {
            const result = await authWorkerPool.executeTask({
                operation: 'generateFingerprint',
                data: data
            });
            
            if (result.success) {
                return result.result;
            }
        } catch (error) {
            logger.error('Error generating fingerprint with worker', { error: error.message });
        }
        
        // Fallback to synchronous generation
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex')
            .substring(0, 32);
    };

    // Check if user can join (smart session control: registered users vs guests)
    const canUserJoin = async (username, ipAddress, deviceFingerprint, socketId) => {
        try {
            const isGuest = username.startsWith('guest_');
            const isRegistered = !isGuest;

            // ══════════════════════════════════════════════════════
            // CASO 1: VERIFICAR SI EL MISMO USUARIO YA ESTÁ ACTIVO EN OTRA IP
            // ══════════════════════════════════════════════════════
            const sameUserDifferentIP = await Session.findOne({
                username,
                ipAddress: { $ne: ipAddress },
                isActive: true,
                socketId: { $ne: socketId }
            });

            if (sameUserDifferentIP) {
                logger.warn('User already active from different IP', { username, currentIP: ipAddress, activeIP: sameUserDifferentIP.ipAddress });
                return {
                    allowed: false,
                    reason: `El usuario "${username}" ya tiene una sesión activa desde otra ubicación (IP: ${sameUserDifferentIP.ipAddress}). Cierra esa sesión primero.`
                };
            }

            // ══════════════════════════════════════════════════════
            // CASO 2: VERIFICAR SI EL MISMO USUARIO YA ESTÁ ACTIVO EN LA MISMA IP (reconexión)
            // ══════════════════════════════════════════════════════
            const sameUserSameIP = await Session.findOne({
                username,
                ipAddress,
                isActive: true,
                socketId: { $ne: socketId }
            });

            if (sameUserSameIP) {
                logger.info('User reconnecting from same IP', { username, ipAddress });
                
                // Close previous session
                sameUserSameIP.isActive = false;
                await sameUserSameIP.save();
                return { allowed: true, reconnection: true };
            }

            // ══════════════════════════════════════════════════════
            // CASO 3: CONTROL DE INVITADOS - Solo 1 invitado por IP
            // ══════════════════════════════════════════════════════
            if (isGuest) {
                const guestSessionFromIP = await Session.findOne({
                    username: { $regex: /^guest_/ },
                    ipAddress,
                    isActive: true,
                    socketId: { $ne: socketId }
                });

                if (guestSessionFromIP) {
                    logger.warn('IP blocked - guest already active', { ipAddress, guestUser: guestSessionFromIP.username });
                    return {
                        allowed: false,
                        reason: `Ya hay un invitado activo desde este dispositivo ("${guestSessionFromIP.username}"). Solo se permite un usuario invitado por dispositivo.`
                    };
                }
            }

            // ══════════════════════════════════════════════════════
            // CASO 4: USUARIO REGISTRADO REEMPLAZA INVITADO DE LA MISMA IP
            // ══════════════════════════════════════════════════════
            if (isRegistered) {
                const guestSessionFromIP = await Session.findOne({
                    username: { $regex: /^guest_/ },
                    ipAddress,
                    isActive: true,
                    socketId: { $ne: socketId }
                });

                if (guestSessionFromIP) {
                    // Close guest session
                    const guestSocket = io.sockets.sockets.get(guestSessionFromIP.socketId);
                    if (guestSocket) {
                        logger.info('Registered user replacing guest session', { username, guestUser: guestSessionFromIP.username, ipAddress });
                        guestSocket.emit('replacedByRegisteredUser', {
                            message: 'Tu sesión de invitado fue reemplazada por un usuario registrado'
                        });
                        guestSocket.disconnect();
                    }
                    
                    guestSessionFromIP.isActive = false;
                    await guestSessionFromIP.save();
                    return { allowed: true, replacedGuest: true };
                }
            }

            // ✅ PERMITIR: No hay conflictos
            return { allowed: true };
        } catch (error) {
            logger.error('Error checking user session', { username, error: error.message });
            return { allowed: true }; // Allow in case of error
        }
    };

    const joinRoom = async (socket, pin, username) => {
        const ipAddress = getRealIP(socket);  // ✅ Obtener IP real considerando proxies
        const deviceFingerprint = await generateDeviceFingerprint(socket);

        // ✅ VALIDACIÓN DE SESIÓN ÚNICA (PARA TODAS LAS SALAS, INCLUYENDO GENERAL)
        const sessionCheck = await canUserJoin(username, ipAddress, deviceFingerprint, socket.id);
        if (!sessionCheck.allowed) {
            throw new Error(sessionCheck.reason);
        }

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
                    roomPin: 'general',
                    isActive: true,
                    lastActivity: new Date()
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

        // Session check already done above (no need to repeat)

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
        const ipAddress = getRealIP(socket);  // ✅ Obtener IP real considerando proxies

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
        logger.info('Socket connected', { socketId: socket.id });

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
                logger.error('Error creating room', { error: error.message, roomName: data.name });
                socket.emit('roomCreationError', { message: error.message });
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

        socket.on('sendMessage', async (data, callback) => {
            try {
                const roomPin = data.roomPin || socketRooms.get(socket.id) || 'general';
                const ipAddress = getRealIP(socket);  // ✅ Obtener IP real considerando proxies
                
                logger.debug('Receiving message', { roomPin, username: data.username, hasImage: !!data.imageUrl, hasVoice: !!data.voiceUrl });

                // Validate and sanitize message using worker thread (if text message)
                let processedMessage = data.message;
                if (data.message && !data.imageUrl && !data.voiceUrl) {
                    try {
                        const messageResult = await messageWorkerPool.executeTask({
                            message: data.message,
                            options: { maxLength: 5000 }
                        });
                        
                        if (!messageResult.success) {
                            logger.warn('Message validation failed', { errors: messageResult.errors });
                            socket.emit('messageError', { 
                                message: 'Mensaje inválido: ' + (messageResult.errors?.join(', ') || 'Error desconocido')
                            });
                            if (callback) {
                                callback({ success: false, error: 'Message validation failed' });
                            }
                            return;
                        }
                        
                        // Use sanitized message
                        processedMessage = messageResult.result.sanitized;
                        logger.debug('Message processed by worker thread');
                    } catch (workerError) {
                        logger.warn('Worker error, using original message', { error: workerError.message });
                        // Continue with original message if worker fails
                    }
                }
                
                // Save message with processed content
                const messageData = {
                    ...data,
                    message: processedMessage,
                    roomPin
                };
                
                const message = await createMessage(messageData);
                
                logger.info('Message saved', { messageId: message._id, roomPin });

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
                        messageLength: processedMessage?.length || 0,
                        hasImage: !!data.imageUrl,
                        hasSticker: !!data.sticker,
                        hasVoice: !!data.voiceUrl,
                        wasProcessedByWorker: !!processedMessage && processedMessage !== data.message
                    }
                });
                
                logger.debug('Message processed successfully');
                
                // Call callback to confirm success
                if (callback) {
                    callback({ success: true, message });
                }
            } catch (error) {
                logger.error('Error sending message', { error: error.message });
                socket.emit('messageError', { message: 'Error al enviar mensaje' });
                
                // Call callback with error
                if (callback) {
                    callback({ success: false, error: error.message });
                }
            }
        });

        socket.on('createRoom', async ({ name, maxParticipants, type, username }) => {
            try {
                const ipAddress = getRealIP(socket);  // ✅ Obtener IP real considerando proxies
                const deviceFingerprint = await generateDeviceFingerprint(socket);
                
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
                logger.error('Error creating room', { error: error.message });
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
                    getRealIP(socket),  // ✅ Obtener IP real considerando proxies
                    await generateDeviceFingerprint(socket)
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
                    ipAddress: getRealIP(socket),  // ✅ Obtener IP real considerando proxies
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
                logger.error('Error closing room', { error: error.message });
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
                logger.error('Error getting user stats', { error: error.message });
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
                logger.error('Error getting user rooms', { error: error.message });
                socket.emit('roomError', { 
                    message: 'Error al obtener tus salas' 
                });
            }
        });

        socket.on('disconnect', async () => {
            const pin = socket.roomPin || socketRooms.get(socket.id);
            const username = socket.username || 'Desconocido';
            const ipAddress = getRealIP(socket);  // ✅ Obtener IP real considerando proxies

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
