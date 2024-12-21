import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import '../App.css';

// Bandera para habilitar anuncios
const ADS_ENABLED = false;

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [replyTo, setReplyTo] = useState(null);

    // Estado para manejar el modo oscuro
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true';
    });

    // Alternar el modo oscuro
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('darkMode', newMode);
    };

    // Aplicar clase al body según el modo
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

    // Generar nombre de usuario
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

    // Función para solicitar permisos de notificación
    const requestNotificationPermission = async () => {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Permiso concedido para notificaciones');
            } else {
                console.log('Permiso denegado para notificaciones');
            }
        } else {
            console.log('El navegador no soporta notificaciones push.');
        }
    };

    // Enviar una notificación push con sonido
    const sendNotification = (message) => {
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.getRegistration().then(registration => {
                // Mostrar la notificación
                registration.showNotification('Nuevo mensaje recibido', {
                    body: `${message.username}: ${message.message || message.sticker}`,
                    icon: '/favicon.ico', // Asegúrate de tener este ícono en la carpeta public
                });

                // Reproducir sonido
                const audio = new Audio('/notification.mp3'); // Asegúrate de tener el archivo en public/
                audio.play();
            });
        }
    };

    // Cargar mensajes iniciales
    useEffect(() => {
        const currentUsername = generateUsername();
        setUsername(currentUsername);

        fetch('https://chatentiemporealv2.onrender.com/api/chat')
            .then(response => response.json())
            .then(data => setMessages(data));

        socket.on('receiveMessage', (message) => {
            setMessages((prev) => [...prev, message]);
            
            // Notificar si el mensaje no es del usuario actual
            if (message.username !== username) {
                sendNotification(message);
            }
        });

        return () => socket.off('receiveMessage');
    }, [username]);

    // Seleccionar mensaje para responder
    const handleReply = (messageId) => {
        const message = messages.find(msg => msg._id === messageId);
        setReplyTo(message);
    };

    // Solicitar permiso para notificaciones al cargar el componente
    useEffect(() => {
        requestNotificationPermission();
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
                    <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
                    </button>
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
