import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import { cryptoService } from '../services/cryptoService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RoomManager from './RoomManager';
import RoomParticipants from './RoomParticipants';
import UserStats from './UserStats';
import AuthModal from './AuthModal';
import AdminPanel from './AdminPanel';
import '../App.css';

const ADS_ENABLED = false;

const ChatBox = ({ initialRoomPin }) => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState('user');
    const [replyTo, setReplyTo] = useState(null);
    const [currentRoom, setCurrentRoom] = useState('general');
    const [roomInfo, setRoomInfo] = useState({ name: 'Chat General' });
    const [autoJoining, setAutoJoining] = useState(!!initialRoomPin);
    // Add the missing participants state
    const [participants, setParticipants] = useState([]);
    const [error, setError] = useState(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
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

    const checkAuthentication = () => {
        const storedUsername = localStorage.getItem('username');
        const token = localStorage.getItem('userToken');
        const isGuest = localStorage.getItem('isGuest') === 'true';
        
        if (storedUsername) {
            setUsername(storedUsername);
            setIsAuthenticated(true);
            // Si tiene token de usuario registrado, establecer rol
            if (token && !isGuest) {
                const role = localStorage.getItem('userRole') || 'user';
                setUserRole(role);
            }
            return true;
        } else {
            // Si no hay username, mostrar modal de autenticación
            setShowAuthModal(true);
            return false;
        }
    };

    const handleAuthSuccess = (authData) => {
        console.log('✅ Autenticación exitosa:', authData);
        
        // Guardar datos de autenticación
        setUsername(authData.username);
        setUserRole(authData.role || 'user');
        setIsAuthenticated(true);
        
        // Guardar en localStorage
        localStorage.setItem('username', authData.username);
        if (authData.token) {
            localStorage.setItem('userToken', authData.token);
            localStorage.setItem('userRole', authData.role || 'user');
            localStorage.setItem('isGuest', 'false');
        } else {
            // Es invitado
            localStorage.setItem('isGuest', 'true');
        }
        
        setShowAuthModal(false);
        
        // Si hay una sala pendiente de unirse (desde URL)
        if (initialRoomPin) {
            handleJoinRoom(initialRoomPin);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isGuest');
        setIsAuthenticated(false);
        setUsername('');
        setShowAuthModal(true);
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
        // Verificar autenticación al cargar el componente
        const isAuth = checkAuthentication();
        
        // Si NO está autenticado, no hacer nada más hasta que inicie sesión
        if (!isAuth) {
            console.log('❌ Usuario no autenticado, mostrando modal de login');
        }
    }, []);

    useEffect(() => {
        if (!username) return; // Skip if username is not set yet
        
        // NO unirse automáticamente a general si hay un initialRoomPin pendiente
        if (initialRoomPin) {
            console.log('⏳ Esperando a unirse a sala específica con PIN:', initialRoomPin);
            return; // El otro useEffect manejará el join
        }
        
        // Unirse a la sala general por defecto solo si no hay PIN inicial
        if (currentRoom === 'general') {
            console.log('✅ Uniéndose a sala general por defecto');
            socket.emit('joinRoom', { pin: 'general', username });
        }

        // Escuchar eventos de sala
        socket.on('roomJoined', async (room) => {
            console.log('🔐 Sala unida con cifrado E2E:', room.pin);
            setCurrentRoom(room.pin);
            setRoomInfo(room);
            
            // Initialize crypto service and set room encryption key FIRST
            if (room.encryptionKey) {
                await cryptoService.initialize();
                cryptoService.setRoomKey(room.pin, room.encryptionKey);
                console.log('✅ Clave de cifrado E2E establecida para sala', room.pin);
            } else {
                console.warn('⚠️ No se recibió clave de cifrado para la sala');
            }
            
            if (room.participants) {
                setParticipants(room.participants);
            }
            
            // WAIT for encryption key to be set before loading messages
            try {
                const response = await fetch(`${process.env.REACT_APP_SOCKET_SERVER_URL}/api/chat?roomPin=${room.pin}`);
                const data = await response.json();
                
                // Decrypt historical messages (only if they have encrypted data)
                const decryptedMessages = await Promise.all(
                    data.map(async (msg) => {
                        if (msg.encryptedMessage && msg.encryptedMessage.ciphertext && msg.encryptedMessage.nonce) {
                            try {
                                const decrypted = await cryptoService.decryptMessage(
                                    msg.encryptedMessage,
                                    room.pin
                                );
                                msg.message = decrypted;
                                console.log('🔓 Mensaje histórico descifrado correctamente');
                            } catch (error) {
                                console.error('❌ Error descifrando mensaje histórico:', error.message);
                                msg.message = '[Error: No se pudo descifrar - clave incorrecta]';
                            }
                        }
                        // Si no tiene encryptedMessage, usar el mensaje en texto plano (legacy)
                        return msg;
                    })
                );
                setMessages(decryptedMessages);
                console.log('📜 Mensajes cargados:', decryptedMessages.length);
            } catch (error) {
                console.error('Error cargando mensajes:', error);
            }
        });

        socket.on('userJoined', ({ username: joinedUser, room, participants }) => {
            console.log('👤 Usuario unido:', joinedUser, 'Participantes:', participants?.length);
            if (participants) {
                setParticipants(participants);
            }
            if (room) {
                setRoomInfo(room);
            }
        });

        socket.on('userLeft', ({ username: leftUser, room, participants }) => {
            console.log('👋 Usuario salió:', leftUser, 'Participantes restantes:', participants?.length);
            if (participants) {
                setParticipants(participants);
            }
            if (room) {
                setRoomInfo(room);
            }
        });

        socket.on('roomLeft', () => {
            setMessages([]);
            setParticipants([]);
        });

        socket.on('receiveMessage', async (message) => {
            if (message.roomPin === currentRoom) {
                // Decrypt message if it's encrypted (has valid encrypted data)
                if (message.encryptedMessage && message.encryptedMessage.ciphertext && message.encryptedMessage.nonce) {
                    try {
                        const decrypted = await cryptoService.decryptMessage(
                            message.encryptedMessage,
                            currentRoom
                        );
                        message.message = decrypted;
                        console.log('🔓 Mensaje descifrado en tiempo real');
                    } catch (error) {
                        console.error('❌ Error descifrando mensaje:', error);
                        message.message = '[Error: No se pudo descifrar el mensaje]';
                    }
                }
                // Si no tiene encryptedMessage, usar el mensaje en texto plano (legacy)
                
                setMessages((prev) => [...prev, message]);
                if (message.username !== username) {
                    sendNotification(message);
                }
            }
        });

        // Función común para manejar errores de sesión
        const handleSessionError = (error) => {
            console.error('Session/Room error:', error.message);
            setError(error.message);
            setAutoJoining(false);
            
            // Si es error de sesión duplicada, forzar logout
            if (error.message && (
                error.message.includes('ya tiene una sesión activa') ||
                error.message.includes('Ya hay un usuario') ||
                error.message.includes('Ya hay un invitado') ||
                error.message.includes('sesión activa desde este dispositivo')
            )) {
                console.log('🚫 Sesión bloqueada: cerrando conexión');
                
                // Desconectar socket
                socket.disconnect();
                
                // Limpiar datos locales
                localStorage.removeItem('userToken');
                localStorage.removeItem('username');
                localStorage.removeItem('userRole');
                localStorage.removeItem('isGuest');
                
                // Resetear estados
                setIsAuthenticated(false);
                setUsername('');
                setCurrentRoom('general');
                setMessages([]);
                
                // Mostrar alerta bloqueante
                alert(`❌ ACCESO BLOQUEADO\n\n${error.message}\n\nPor favor, cierra la otra sesión primero.`);
                
                // Recargar página después de 1 segundo
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        };

        socket.on('sessionError', handleSessionError);
        socket.on('roomError', handleSessionError);

        socket.on('replacedByRegisteredUser', (data) => {
            console.log('⚠️ Sesión de invitado reemplazada por usuario registrado');
            alert(`Tu sesión de invitado ha sido reemplazada por un usuario registrado desde el mismo dispositivo.`);
            
            // Desconectar y limpiar
            socket.disconnect();
            localStorage.clear();
            window.location.reload();
        });

        return () => {
            socket.off('roomJoined');
            socket.off('roomLeft');
            socket.off('receiveMessage');
            socket.off('userJoined');
            socket.off('userLeft');
            socket.off('sessionError');
            socket.off('roomError');
            socket.off('replacedByRegisteredUser');
        };
    }, [currentRoom, username, initialRoomPin]);

    useEffect(() => {
        // Solo intentar unirse si hay PIN y el usuario está autenticado
        if (initialRoomPin && username) {
            setAutoJoining(true);
            console.log('Uniéndose automáticamente a la sala con PIN:', initialRoomPin);
            socket.emit('joinRoom', {
                pin: initialRoomPin,
                username: username
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
                // Redirigir a la página principal usando la URL base del .env
                window.location.href = process.env.REACT_APP_BASE_URL || 'https://chat-en-tiempo-real-v2.vercel.app';
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
            {/* Auth Modal - No puede cerrarse sin autenticación */}
            {showAuthModal && (
                <AuthModal 
                    onAuthSuccess={handleAuthSuccess}
                />
            )}

            {/* Solo mostrar el chat si el usuario está autenticado */}
            {!showAuthModal && username && (
                <>
                    {/* Admin Panel Modal */}
                    {showAdminPanel && (
                        <AdminPanel
                            userToken={localStorage.getItem('userToken')}
                            userRole={userRole}
                            onClose={() => setShowAdminPanel(false)}
                        />
                    )}
                    
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
                    <div className="chat-header-container">
                        <h1 className="chat-header">
                            {autoJoining ? 'Uniéndose a la sala...' : roomInfo.name}
                        </h1>
                        <div className="header-buttons">
                            {/* Todos los usuarios pueden acceder a configuración (excepto invitados) */}
                            {localStorage.getItem('isGuest') !== 'true' && (
                                <button 
                                    className="admin-settings-button" 
                                    onClick={() => setShowAdminPanel(true)}
                                    title="Configuración"
                                >
                                    ⚙️ Configuración
                                </button>
                            )}
                            <button className="logout-button" onClick={handleLogout} title="Cerrar sesión">
                                🚪 Salir
                            </button>
                        </div>
                    </div>
                    
                    <h2 className="chat-username">
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                            borderRadius: '20px',
                            fontSize: '1rem'
                        }}>
                            👤 Usuario: <strong>{username}</strong>
                            {userRole === 'admin' && <span className="admin-badge-inline">⭐ ADMIN</span>}
                            {localStorage.getItem('isGuest') === 'true' && <span className="guest-badge">👻 Invitado</span>}
                        </span>
                    </h2>
                    
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
                    
                    {/* User Stats Component */}
                    <UserStats username={username} />
                    
                    <div className="current-room-info">
                        <h3>
                            Sala Actual: {roomInfo.name} 
                            {currentRoom !== 'general' && ` (PIN: ${currentRoom})`}
                            {roomInfo.type === 'text' && (
                                <span className="room-type-badge text-only" title="Solo se permiten mensajes de texto">
                                    📝 Solo Texto
                                </span>
                            )}
                            {roomInfo.type !== 'text' && roomInfo.type && (
                                <span className="room-type-badge full-features" title="Todas las funcionalidades disponibles">
                                    ✨ Multimedia
                                </span>
                            )}
                        </h3>
                        
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
                        roomInfo={roomInfo}
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
                </>
            )}
        </div>
    );
};

export default ChatBox;
