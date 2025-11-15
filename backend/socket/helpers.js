const crypto = require('crypto');
const { authWorkerPool } = require('../services/workerPool');
const logger = require('../utils/logger');

// Helper function to safely convert room to plain object
const roomToObject = (room) => {
    let roomObj;
    if (typeof room.toObject === 'function') {
        roomObj = room.toObject();
    } else {
        roomObj = room;
    }
    
    // Ensure participantCount is included
    if (roomObj && roomObj.participants) {
        roomObj.participantCount = roomObj.participants.length;
        roomObj.isFull = roomObj.participants.length >= (roomObj.maxParticipants || 10);
    }
    
    return roomObj;
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
        userAgent: socket.handshake.headers['user-agent'] || 'unknown',
        acceptLanguage: socket.handshake.headers['accept-language'] || 'unknown',
        acceptEncoding: socket.handshake.headers['accept-encoding'] || 'unknown'
    };

    try {
        const result = await authWorkerPool.executeTask({
            operation: 'generateFingerprint',
            data
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

// Emit room update event
const emitRoomUpdate = (io, room) => {
    io.emit('roomUpdated', {
        pin: room.pin,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants
    });
};

// Emit user activity event
const emitUserActivity = (io, type, username, room, extra = {}) => {
    io.emit('userActivity', {
        type,
        username,
        room,
        timestamp: new Date(),
        ...extra
    });
};

module.exports = {
    roomToObject,
    getRealIP,
    normalizeIP,
    generateDeviceFingerprint,
    emitRoomUpdate,
    emitUserActivity
};
