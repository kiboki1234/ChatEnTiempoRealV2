const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { handleJoinRoom, handleLeaveRoom, handleCreateRoom, handleCloseRoom } = require('./roomHandlers');
const { handleSendMessage } = require('./messageHandlers');
const { handleGetUserStats, handleGetMyRooms, handleDisconnect, handleHeartbeat } = require('./userHandlers');

module.exports = (server) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'https://chat-en-tiempo-real-v2.vercel.app',
        'https://chat-en-tiempo-real-v2.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    const io = new Server(server, {
        cors: {
            origin: function(origin, callback) {
                // Allow requests with no origin (mobile apps, Postman, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
                    callback(null, true);
                } else {
                    logger.warn('Socket.IO CORS blocked origin', { origin });
                    callback(null, true); // Allow in production for now
                }
            },
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 10000,
        pingInterval: 25000,
        cookie: false
    });

    io.on('connection', (socket) => {
        logger.info('Socket connected', { socketId: socket.id });

        // Room events
        socket.on('joinRoom', async (data) => {
            await handleJoinRoom(io)(socket, data);
        });

        socket.on('leaveRoom', async () => {
            await handleLeaveRoom(io)(socket);
        });

        socket.on('createRoom', async (data) => {
            await handleCreateRoom(io)(socket, data);
        });

        socket.on('closeRoom', async (data) => {
            await handleCloseRoom(io)(socket, data);
        });

        // Message events
        socket.on('sendMessage', async (data, callback) => {
            await handleSendMessage(io)(socket, data, callback);
        });

        // User events
        socket.on('getUserStats', async (data) => {
            await handleGetUserStats()(socket, data);
        });

        socket.on('getMyRooms', async (data) => {
            await handleGetMyRooms()(socket, data);
        });

        socket.on('heartbeat', async () => {
            await handleHeartbeat()(socket);
        });

        // Connection events
        socket.on('disconnect', async () => {
            await handleDisconnect(io)(socket);
        });
    });

    return io;
};
