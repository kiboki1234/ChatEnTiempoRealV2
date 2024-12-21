import React, { useState } from 'react';
import socket from '../services/socketService';

const MessageInput = ({ username, replyTo, setReplyTo }) => {
    const [input, setInput] = useState('');

    // Función para enviar el mensaje
    const sendMessage = () => {
        if (input.trim() === '') return; // Evitar enviar mensajes vacíos
        const newMessage = { 
            username, 
            message: input, 
            replyTo: replyTo?._id || null 
        };
        socket.emit('sendMessage', newMessage);
        setInput('');
        setReplyTo(null); // Limpiar la respuesta seleccionada
    };

    // Manejar tecla Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') { // Detectar Enter
            sendMessage();
        }
    };

    return (
        <div className="message-input">
            {/* Mostrar el mensaje al que se responde */}
            {replyTo && (
                <div className="reply-preview">
                    Responder a: <strong>{replyTo.username}</strong> - "{replyTo.message}"
                </div>
            )}
            <input
                className="input-box"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress} // Detectar tecla presionada
            />
            <button className="send-button" onClick={sendMessage}>Enviar</button>
        </div>
    );
};

export default MessageInput;
