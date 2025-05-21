const Message = require('../models/Message');

const getMessages = async (req, res) => {
    try {
        const roomPin = req.query.roomPin || 'general';
        const messages = await Message.find({ roomPin }).sort({ timestamp: 1 }).populate('replyTo');
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
};

const createMessage = async (data) => {
    try {
        console.log('Creando mensaje con datos:', data);
        const message = new Message({
            username: data.username,
            message: data.message,
            imageUrl: data.imageUrl || null,
            sticker: data.sticker || null,
            roomPin: data.roomPin || 'general',
            replyTo: data.replyTo || null
        });
        await message.save();
        console.log('Mensaje guardado correctamente');
        return await message.populate('replyTo');
    } catch (error) {
        console.error('Error al guardar el mensaje:', error);
        throw error;
    }
};

module.exports = {
    getMessages,
    createMessage
};