import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import '../App.css';

// Bandera para habilitar anuncios (cambiar a true cuando tengas acceso)
const ADS_ENABLED = false;

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [replyTo, setReplyTo] = useState(null);

    // Generar nombre de usuario único
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

    // Cargar mensajes iniciales y escuchar nuevos mensajes
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

    // Seleccionar mensaje para responder
    const handleReply = (messageId) => {
        const message = messages.find(msg => msg._id === messageId);
        setReplyTo(message);
    };

    // Inicializar anuncios solo si están habilitados
    useEffect(() => {
        if (ADS_ENABLED) {
            const loadAds = () => {
                const ads = document.querySelectorAll('.adsbygoogle');
                ads.forEach(ad => {
                    if (!ad.getAttribute('data-ad-status')) {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    }
                });
            };

            // Carga los anuncios después de un pequeño retraso
            const timeout = setTimeout(() => {
                loadAds();
            }, 300);

            return () => clearTimeout(timeout);
        }
    }, []);

    return (
        <div className="page-container">
            <div className="content-container">
                {/* Anuncio izquierdo */}
                {ADS_ENABLED && (
                    <div className="ad-container ad-left">
                        <ins className="adsbygoogle"
                            style={{ display: "block" }}
                            data-ad-client="ca-pub-5502091173009531"
                            data-ad-slot="1234567890"
                            data-ad-format="auto"
                            data-full-width-responsive="true"></ins>
                    </div>
                )}

                {/* Chat principal */}
                <div className="chat-container">
                    <h1 className="chat-header">Whispers</h1>
                    <h2 className="chat-username">Usuario: {username}</h2>
                    <MessageList messages={messages} onReply={handleReply} username={username} />
                    <MessageInput username={username} replyTo={replyTo} setReplyTo={setReplyTo} />
                </div>

                {/* Anuncio derecho */}
                {ADS_ENABLED && (
                    <div className="ad-container ad-right">
                        <ins className="adsbygoogle"
                            style={{ display: "block" }}
                            data-ad-client="ca-pub-5502091173009531"
                            data-ad-slot="0987654321"
                            data-ad-format="auto"
                            data-full-width-responsive="true"></ins>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatBox;
