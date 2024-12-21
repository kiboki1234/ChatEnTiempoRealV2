import React, { useState, useEffect, useRef } from 'react';
import { FaSmile, FaPaperPlane, FaTimes } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import socket from '../services/socketService';
import '../App.css';
import '../styles/stickers.css';

const MessageInput = ({ username, replyTo, setReplyTo }) => {
    const [input, setInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    // Función para agregar emoji al input
    const addEmojiToInput = (emojiObject) => {
        setInput((prev) => prev + emojiObject.emoji);
        setShowEmojiPicker(false); // Ocultar el selector
    };

    // Función para enviar el mensaje con fecha y hora
    const sendMessage = () => {
        if (input.trim() === '') return;
    
        const newMessage = {
            username,
            message: input,
            sticker: '',
            replyTo: replyTo
                ? { _id: replyTo._id, username: replyTo.username, message: replyTo.message }
                : null,
            timestamp: new Date().toISOString(),
        };
    
        socket.emit('sendMessage', newMessage);
        setInput('');
        setReplyTo(null);
    };
    

    // Manejar tecla Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Cerrar el selector de emojis si se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                event.target.className !== 'emoji-button'
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
                    <button className="cancel-reply-button" onClick={cancelReply}>
                        <FaTimes />
                    </button>
                </div>
            )}
            {/* Botón para abrir el selector de emojis */}
            <button
                className="emoji-button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
                <FaSmile />
            </button>

            {/* Selector de emojis */}
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="emoji-picker-container">
                    <EmojiPicker onEmojiClick={addEmojiToInput} />
                </div>
            )}

            {/* Input para texto */}
            <input
                className="input-box"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
            />

            {/* Botón para enviar */}
            <button className="send-button" onClick={sendMessage}>
                <FaPaperPlane />
            </button>
        </div>
    );
};

export default MessageInput;