import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import '../App.css';

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [replyTo, setReplyTo] = useState(null);

    const generateUsername = () => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            return storedUsername;
        } else {
            const newUsername = `Viuda-${Math.random().toString(36).substring(2, 8)}`;
            localStorage.setItem('username', newUsername);
            return newUsername;
        }
    };

    useEffect(() => {
        const currentUsername = generateUsername();
        setUsername(currentUsername);

        fetch('https://chatentiemporealv2.onrender.com/api/chat')
            .then(response => response.json())
            .then(data => setMessages(data));

        socket.on('receiveMessage', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => socket.off('receiveMessage');
    }, []);

    const handleReply = (messageId) => {
        const message = messages.find(msg => msg._id === messageId);
        setReplyTo(message);
    };

    return (
        <div className="chat-container">
            <h1 className="chat-header">Whispers</h1>
            <h2 className="chat-username">Usuario: {username}</h2>
            <MessageList messages={messages} onReply={handleReply} username={username} />
            <MessageInput username={username} replyTo={replyTo} setReplyTo={setReplyTo} />
        </div>
    );
};

export default ChatBox;
