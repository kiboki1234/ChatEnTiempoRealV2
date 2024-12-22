import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaSmile, FaPaperPlane, FaTimes, FaImage } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import socket from '../services/socketService';
import '../App.css';

const MessageInput = ({ username, replyTo, setReplyTo }) => {
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
                const response = await axios.post(
                    'https://chatentiemporealv2.onrender.com/api/chat/upload',
                    formData
                );
                imageUrl = response.data.imageUrl;
            } catch (error) {
                console.error('Error al subir imagen:', error);
                return;
            }
        }

        const newMessage = {
            username,
            message: input,
            imageUrl,
            sticker: '',
            replyTo: replyTo ? { _id: replyTo._id, username: replyTo.username, message: replyTo.message } : null,
            timestamp: new Date().toISOString(),
        };

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
            <button className="emoji-button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <FaSmile />
            </button>
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="emoji-picker-container">
                    <EmojiPicker onEmojiClick={addEmojiToInput} />
                </div>
            )}
            <input
                className="input-box"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
            />
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
            <button className="send-button" onClick={sendMessage}>
                <FaPaperPlane />
            </button>
        </div>
    );
};

export default MessageInput;
