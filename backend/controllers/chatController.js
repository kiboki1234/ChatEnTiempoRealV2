const Message = require('../models/Message');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/errorHandler');

const getMessages = asyncHandler(async (req, res) => {
    const roomPin = req.query.roomPin || 'general';
    const messages = await Message.find({ roomPin }).sort({ timestamp: 1 }).populate('replyTo');
    res.status(200).json(messages);
});

const createMessage = asyncHandler(async (data) => {
    logger.debug('Creating message', { username: data.username, roomPin: data.roomPin });
    
    const message = new Message({
        username: data.username,
        message: data.message,
        imageUrl: data.imageUrl || null,
        sticker: data.sticker || null,
        roomPin: data.roomPin || 'general',
        replyTo: data.replyTo || null
    });
    
    await message.save();
    logger.info('Message saved', { messageId: message._id, username: data.username });
    
    return await message.populate('replyTo');
});

module.exports = {
    getMessages,
    createMessage
};