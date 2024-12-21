import React, { useState, useEffect, useRef } from 'react';
import { FaSmile, FaPaperPlane, FaTimes } from 'react-icons/fa';
import socket from '../services/socketService';
import '../App.css';

const stickers = [
    '😀', '😂', '😍', '😎', '😭', '😡', '👍', '👎', '🙏', '👏', // Emojis existentes
    '🤩', '🤔', '😴', '🥳', '🤗', '🤯', '💩', '🙌', '😬', '😅' // Nuevos emojis
];

const MessageInput = ({ username, replyTo, setReplyTo }) => {
    const [input, setInput] = useState('');
    const [showStickers, setShowStickers] = useState(false);
    const stickerRef = useRef(null);

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

    // Cerrar stickers al hacer clic fuera o al presionar el botón nuevamente
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (stickerRef.current && !stickerRef.current.contains(event.target) && event.target.className !== 'sticker-button') {
                setShowStickers(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cancelar intento de responder
    const cancelReply = () => {
        setReplyTo(null);
    };

    return (
        <div className="message-input">
            {replyTo && (
                <div className="reply-preview">
                    Responder a: <strong>{replyTo.username}</strong> - "{replyTo.message}"
                    <button className="cancel-reply-button" onClick={cancelReply}><FaTimes /></button>
                </div>
            )}
            <button className="sticker-button" onClick={() => setShowStickers((prev) => !prev)}><FaSmile /></button>
            <input
                className="input-box"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
            />
            <button className="send-button" onClick={sendMessage}><FaPaperPlane /></button>

            {showStickers && (
                <div className="sticker-container" ref={stickerRef}>
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
