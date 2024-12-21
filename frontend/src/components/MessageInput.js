import React, { useState } from 'react';
import socket from '../services/socketService';
import '../styles/sendMessages.css';

const stickers = [
    '😀', '😂', '😍', '😎', '😭', '😡', '👍', '👎', '🙏', '👏', // Emojis existentes
    '🤩', '🤔', '😴', '🥳', '🤗', '🤯', '💩', '🙌', '😬', '😅' // Nuevos emojis
];

const MessageInput = ({ username, replyTo, setReplyTo }) => {
    const [input, setInput] = useState('');
    const [showStickers, setShowStickers] = useState(false);

    // Función para agregar stickers al input
    const addStickerToInput = (sticker) => {
        setInput((prev) => prev + sticker); // Añadir el sticker al input
        setShowStickers(false); // Ocultar la lista de stickers
    };

    // Función para enviar el mensaje
    const sendMessage = () => {
        if (input.trim() === '') return; // Evitar enviar mensajes vacíos

        const newMessage = {
            username,
            message: input, // Enviar el contenido del input
            sticker: '', // Limpiar campo sticker ya que se envía como texto
            replyTo: replyTo?._id || null
        };
        socket.emit('sendMessage', newMessage);
        setInput('');
        setReplyTo(null); // Limpiar la respuesta seleccionada
    };

    // Manejar tecla Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <div className="message-input">
            {replyTo && (
                <div className="reply-preview">
                    Responder a: <strong>{replyTo.username}</strong> - "{replyTo.message}"
                </div>
            )}
            <input
                className="input-box"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
            />
            <button className="send-button" onClick={sendMessage}>Enviar</button>
            <button className="sticker-button" onClick={() => setShowStickers(!showStickers)}>😀</button>

            {showStickers && (
                <div className="sticker-container">
                    <div className="sticker-list">
                        {stickers.map((sticker, index) => (
                            <button
                                key={index}
                                className="sticker-item"
                                onClick={() => addStickerToInput(sticker)} // Insertar sticker en el input
                            >
                                {sticker}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageInput;
