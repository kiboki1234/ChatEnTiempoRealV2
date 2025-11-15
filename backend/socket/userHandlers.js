const UserService = require('../services/userService');
const { closeSession } = require('./sessionManager');
const { handleLeaveRoom } = require('./roomHandlers');
const logger = require('../utils/logger');

// Get user stats handler
const handleGetUserStats = () => async (socket, { username }) => {
    try {
        const stats = await UserService.getUserStats(username);
        socket.emit('userStats', stats);
    } catch (error) {
        logger.error('Error getting user stats', { error: error.message });
        socket.emit('statsError', { 
            message: 'Error al obtener estadísticas' 
        });
    }
};

// Get user rooms handler
const handleGetMyRooms = () => async (socket, { username }) => {
    try {
        const stats = await UserService.getUserStats(username);
        socket.emit('myRooms', {
            rooms: stats.activeRooms,
            canCreate: stats.canCreateRoom,
            details: stats.canCreateRoomDetails
        });
    } catch (error) {
        logger.error('Error getting user rooms', { error: error.message });
        socket.emit('roomError', { 
            message: 'Error al obtener tus salas' 
        });
    }
};

// Disconnect handler
const handleDisconnect = (io) => async (socket) => {
    try {
        await handleLeaveRoom(io)(socket);
        await closeSession(socket.id);
        
        logger.info('User disconnected', { socketId: socket.id });
    } catch (error) {
        logger.error('Error in disconnect handler', { error: error.message });
    }
};

// Heartbeat handler
const handleHeartbeat = () => async (socket) => {
    socket.emit('heartbeat-response', { timestamp: Date.now() });
};

module.exports = {
    handleGetUserStats,
    handleGetMyRooms,
    handleDisconnect,
    handleHeartbeat
};
