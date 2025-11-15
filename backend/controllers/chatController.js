const Message = require('../models/Message');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/errorHandler');

const getMessages = asyncHandler(async (req, res) => {
    const roomPin = req.query.roomPin || 'general';
    const messages = await Message.find({ roomPin }).sort({ timestamp: 1 }).populate('replyTo');
    res.status(200).json(messages);
});

const createMessage = async (data) => {
    logger.debug('Creating message', { 
        username: data.username, 
        roomPin: data.roomPin,
        hasVoice: !!data.voiceUrl,
        hasImage: !!data.imageUrl,
        isEncrypted: !!data.encryptedMessage
    });
    
    try {
        const message = new Message({
            username: data.username,
            message: data.message, // Placeholder or plain text
            encryptedMessage: data.encryptedMessage || null, // E2E encrypted data
            imageUrl: data.imageUrl || null,
            voiceUrl: data.voiceUrl || null,
            voiceDuration: data.voiceDuration || null,
            sticker: data.sticker || null,
            roomPin: data.roomPin || 'general',
            replyTo: data.replyTo || null
        });
        
        await message.save();
        logger.info('Message saved', { 
            messageId: message._id, 
            username: data.username,
            roomPin: data.roomPin,
            e2ee: !!data.encryptedMessage
        });
        
        // Populate replyTo if exists
        if (data.replyTo) {
            await message.populate('replyTo');
        }
        
        return message;
    } catch (error) {
        logger.error('Error creating message', { error: error.message, data });
        throw error;
    }
};

module.exports = {
    getMessages,
    createMessage
};