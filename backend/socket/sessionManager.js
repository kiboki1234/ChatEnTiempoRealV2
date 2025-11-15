const Session = require('../models/Session');
const logger = require('../utils/logger');

const activeSessions = new Map();

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
                // Return info that guest needs to be closed, handler will do it
                return { 
                    allowed: true, 
                    replacedGuest: true,
                    guestSocketId: guestSessionFromIP.socketId,
                    guestUsername: guestSessionFromIP.username
                };
            }
        }

        // ✅ PERMITIR: No hay conflictos
        return { allowed: true };
    } catch (error) {
        logger.error('Error checking user session', { username, error: error.message });
        return { allowed: true }; // Allow in case of error
    }
};

// Create or update session
const createOrUpdateSession = async (socket, username, ipAddress, deviceFingerprint) => {
    try {
        // Check for existing session
        let session = await Session.findOne({ socketId: socket.id });
        
        if (session) {
            // Update existing session
            session.username = username;
            session.ipAddress = ipAddress;
            session.deviceFingerprint = deviceFingerprint;
            session.isActive = true;
            session.lastActivity = new Date();
        } else {
            // Create new session
            session = new Session({
                socketId: socket.id,
                username,
                ipAddress,
                deviceFingerprint,
                isActive: true
            });
        }
        
        await session.save();
        activeSessions.set(socket.id, session);
        
        return session;
    } catch (error) {
        logger.error('Error creating/updating session', { error: error.message });
        throw error;
    }
};

// Close session
const closeSession = async (socketId) => {
    try {
        const session = await Session.findOne({ socketId });
        
        if (session) {
            session.isActive = false;
            session.endedAt = new Date();
            await session.save();
        }
        
        activeSessions.delete(socketId);
    } catch (error) {
        logger.error('Error closing session', { socketId, error: error.message });
    }
};

// Get active sessions
const getActiveSessions = () => {
    return activeSessions;
};

module.exports = {
    canUserJoin,
    createOrUpdateSession,
    closeSession,
    getActiveSessions
};
