const Message = require('../models/Message');

const getMessages = async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 }).populate('replyTo');
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
};

const createMessage = async (data) => {
    try {
        const message = new Message(data);
        await message.save();
        return await message.populate('replyTo');
    } catch (error) {
        console.error('Error al guardar el mensaje:', error);
    }
};

module.exports = {
    getMessages,
    createMessage
};