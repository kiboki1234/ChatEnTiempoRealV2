const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { handleJoinRoom, handleLeaveRoom, handleCreateRoom, handleCloseRoom } = require('./roomHandlers');
const { handleSendMessage } = require('./messageHandlers');
const { handleGetUserStats, handleGetMyRooms, handleDisconnect, handleHeartbeat } = require('./userHandlers');

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
