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
    const [imagePreview, setImagePreview] = useState(null);
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

        console.log('📤 Enviando mensaje:', newMessage);
        
        // Emitir el mensaje a través del socket
        socket.emit('sendMessage', newMessage, (response) => {
            if (response && response.success) {
                console.log('✅ Mensaje enviado con éxito');
            } else {
                console.error('❌ Error al enviar el mensaje:', response?.error || 'Error desconocido');
                // Podrías querer mostrar un mensaje de error al usuario aquí
                alert('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
            }
        });
        
        // Limpiar el formulario
        setInput('');
        setImage(null);
        setImagePreview(null);
        setReplyTo(null);
        // Limpiar el input file
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            // Crear URL de previsualización
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const cancelImage = () => {
        setImage(null);
        setImagePreview(null);
        // Limpiar el input file
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.value = '';
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
            {/* Previsualización de imagen */}
            {imagePreview && (
                <div className="image-preview-container">
                    <div className="image-preview-wrapper">
                        <img src={imagePreview} alt="Preview" className="image-preview" />
                        <button className="cancel-image-button" onClick={cancelImage} title="Eliminar imagen">
                            <FaTimes />
                        </button>
                    </div>
                    <p className="image-preview-label">Vista previa de la imagen</p>
                </div>
            )}
            
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
