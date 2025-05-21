import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RoomManager from './RoomManager';
import RoomParticipants from './RoomParticipants';
import '../App.css';

const ADS_ENABLED = false;

const ChatBox = ({ initialRoomPin }) => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [currentRoom, setCurrentRoom] = useState('general');
    const [roomInfo, setRoomInfo] = useState({ name: 'Chat General' });
    const [autoJoining, setAutoJoining] = useState(!!initialRoomPin);
    // Add the missing participants state
    const [participants, setParticipants] = useState([]);
    const [error, setError] = useState(null);
    // Add the missing darkMode state
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true';
    });

    // Add the toggleDarkMode function
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('darkMode', newMode);
    };
    
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

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

    const sendNotification = (message) => {
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.getRegistration().then(registration => {
                registration.showNotification('Nuevo mensaje recibido', {
                    body: `${message.username}: ${message.message || message.sticker}`,
                    icon: '/favicon.ico',
                });

                const audio = new Audio('/notification.mp3');
                audio.play();
            });
        }
    };

    useEffect(() => {
        // Initialize username only once
        if (!username) {
            const currentUsername = generateUsername();
            setUsername(currentUsername);
        }
    }, []);

    useEffect(() => {
        if (!username) return; // Skip if username is not set yet
        
        // Unirse a la sala general por defecto
        if (currentRoom === 'general') {
            socket.emit('joinRoom', { pin: 'general', username });
        }

        // Escuchar eventos de sala
        socket.on('roomJoined', (room) => {
            setCurrentRoom(room.pin);
            setRoomInfo(room);
            
            if (room.participants) {
                setParticipants(room.participants);
            }
            
            // Cargar mensajes de la sala
            fetch(`${process.env.REACT_APP_SOCKET_SERVER_URL}/api/chat?roomPin=${room.pin}`)
                .then(response => response.json())
                .then(data => {
                    setMessages(data);
                })
        });

        socket.on('userJoined', ({ participants }) => {
            setParticipants(participants);
        });

        socket.on('userLeft', ({ participants }) => {
            setParticipants(participants);
        });

        socket.on('roomLeft', () => {
            setMessages([]);
            setParticipants([]);
        });

        socket.on('receiveMessage', (message) => {
            if (message.roomPin === currentRoom) {
                setMessages((prev) => [...prev, message]);
                if (message.username !== username) {
                    sendNotification(message);
                }
            }
        });

        socket.on('roomError', (error) => {
            console.error('Room error:', error.message);
            setError(error.message);
            setAutoJoining(false);
        });

        return () => {
            socket.off('roomJoined');
            socket.off('roomLeft');
            socket.off('receiveMessage');
            socket.off('userJoined');
            socket.off('userLeft');
            socket.off('roomError');
        };
    }, [currentRoom, username]);

    useEffect(() => {
        if (initialRoomPin) {
            setAutoJoining(true);
            console.log('Uniéndose automáticamente a la sala con PIN:', initialRoomPin);
            socket.emit('joinRoom', {
                pin: initialRoomPin,
                username: username || generateUsername()
            });
            setCurrentRoom(initialRoomPin);
        }
    }, [initialRoomPin, username]);

    const handleReply = (messageId) => {
        const message = messages.find(msg => msg._id === messageId);
        setReplyTo(message);
    };

    const handleLeaveRoom = () => {
        if (window.confirm('¿Estás seguro de que quieres salir de la sala?')) {
            try {
                socket.emit('leaveRoom');
                handleJoinRoom('general'); // Redirigir al chat general
            } catch (error) {
                setError('Error al salir de la sala. Por favor, inténtalo de nuevo.');
                setTimeout(() => setError(''), 5000);
            }
        }
    };

    const handleJoinRoom = (pin) => {
        if (currentRoom === pin) return;

        console.log('Joining room with PIN:', pin);

        setError(null);

        if (currentRoom !== 'general') {
            console.log('Leaving current room before joining new one');
            socket.emit('leaveRoom');
        }

        socket.emit('joinRoom', { pin, username });
    };

    return (
        <div className="page-container">
            <div className="content-container">
                {ADS_ENABLED && (
                    <div className="ad-container ad-left">
                        <ins className="adsbygoogle"
                            style={{ display: 'block' }}
                            data-ad-client="ca-pub-5502091173009531"
                            data-ad-slot="1234567890"
                            data-ad-format="auto"
                            data-full-width-responsive="true"></ins>
                    </div>
                )}

                <div className="chat-container">
                    <h1 className="chat-header">
                        {autoJoining ? 'Uniéndose a la sala...' : roomInfo.name}
                    </h1>
                    <h2 className="chat-username">Usuario: {username}</h2>
                    <button className="dark-mode-toggle" onClick={toggleDarkMode}>
                        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
                    </button>

                    {error && <div className="error-message">{error}</div>}

                    <RoomManager
                        username={username}
                        onJoinRoom={handleJoinRoom}
                        currentRoom={currentRoom}
                        handleLeaveRoom={handleLeaveRoom}
                    />
                    
                    
                    <div className="current-room-info">
                        <h3>Sala Actual: {roomInfo.name} {currentRoom !== 'general' && `(PIN: ${currentRoom})`}</h3>
                        
                        {currentRoom !== 'general' && (
                            <button 
                                className="leave-room-button"
                                onClick={handleLeaveRoom}
                            >
                                Salir de la Sala
                            </button>
                        )}
                    </div>
                    
                    <RoomParticipants 
                        participants={participants} 
                        currentRoom={currentRoom} 
                    />
                    
                    <MessageList 
                        messages={messages.map(msg => ({
                            ...msg,
                            replyTo: msg.replyTo ? messages.find(m => m._id === msg.replyTo._id) : null
                        }))} 
                        onReply={handleReply} 
                        username={username} 
                    />
                    <MessageInput 
                        username={username} 
                        replyTo={replyTo} 
                        setReplyTo={setReplyTo} 
                        roomPin={currentRoom}
                    />
                </div>

                {ADS_ENABLED && (
                    <div className="ad-container ad-right">
                        <ins className="adsbygoogle"
                            style={{ display: 'block' }}
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
