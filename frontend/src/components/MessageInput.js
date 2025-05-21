import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaSmile, FaPaperPlane, FaTimes, FaImage } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import socket from '../services/socketService';
import '../App.css';

const MessageInput = ({ username, replyTo, setReplyTo, roomPin }) => {
    const [input, setInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [image, setImage] = useState(null);
    const emojiPickerRef = useRef(null);

    const addEmojiToInput = (emojiObject) => {
        setInput((prev) => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const sendMessage = async () => {
        if (!input.trim() && !image) return;
        let imageUrl = null;

        if (image) {
            const formData = new FormData();
            formData.append('image', image);
            try {
                // Asegúrate de que la URL sea correcta
                const response = await axios.post(
                    `${process.env.REACT_APP_SOCKET_SERVER_URL}/api/chat/upload`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                imageUrl = response.data.imageUrl;
                console.log('Imagen subida correctamente:', imageUrl);
            } catch (error) {
                console.error('Error al subir imagen:', error);
                alert('Error al subir la imagen. Por favor, intenta de nuevo.');
                return;
            }
        }

        const newMessage = {
            username,
            message: input,
            imageUrl,
            sticker: '',
            roomPin,
            replyTo: replyTo ? replyTo._id : null,
            timestamp: new Date().toISOString(),
        };

        console.log('Enviando mensaje:', newMessage);
        socket.emit('sendMessage', newMessage);
        setInput('');
        setImage(null);
        setReplyTo(null);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const cancelReply = () => {
        setReplyTo(null);
    };

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

    // Asegúrate de que el input de archivo esté correctamente configurado
    return (
        <div className="message-input">
            {replyTo && (
                <div className="reply-preview">
                    Respondiendo a: {replyTo.username} - "{replyTo.message}"
                    <button className="cancel-reply-button" onClick={cancelReply}>
                        <FaTimes />
                    </button>
                </div>
            )}
            
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="input-box"
            />
            
            <button
                className="emoji-button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
                <FaSmile />
            </button>
            
            <label htmlFor="image-upload" className="image-upload-button">
                <FaImage />
            </label>
            <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
            />
            
            <button onClick={sendMessage} className="send-button">
                <FaPaperPlane />
            </button>
            
            {showEmojiPicker && (
                <div className="emoji-picker-container" ref={emojiPickerRef}>
                    <EmojiPicker onEmojiClick={addEmojiToInput} />
                </div>
            )}
        </div>
    );
};

export default MessageInput;
