const AuditLog = require('../models/AuditLog');
const { createMessage } = require('../controllers/chatController');
const { messageWorkerPool } = require('../services/workerPool');
const { getRealIP } = require('./helpers');
const { getRoomList } = require('./roomHandlers');
const logger = require('../utils/logger');

// Send message handler
const handleSendMessage = (io) => async (socket, data, callback) => {
    try {
        const socketRooms = getRoomList();
        const roomPin = data.roomPin || socketRooms.get(socket.id) || 'general';
        const ipAddress = getRealIP(socket);
        
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
            username: data.username,
            message: processedMessage,
            imageUrl: data.imageUrl || null,
            voiceUrl: data.voiceUrl || null,
            voiceDuration: data.voiceDuration || null,
            sticker: data.sticker || null,
            roomPin: roomPin,
            replyTo: data.replyTo || null
        };
        
        const message = await createMessage(messageData);
        
        logger.info('Message saved', { 
            messageId: message._id, 
            roomPin,
            username: data.username 
        });

        // Emit to room
        io.to(roomPin).emit('receiveMessage', message);

        // Log message
        await AuditLog.create({
            action: 'SEND_MESSAGE',
            username: data.username,
            ipAddress,
            roomPin,
            details: {
                hasImage: !!data.imageUrl,
                hasVoice: !!data.voiceUrl,
                hasText: !!data.message,
                messageLength: processedMessage?.length || 0
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
        
        if (callback) {
            callback({ success: false, error: error.message });
        }
    }
};

module.exports = {
    handleSendMessage
};
