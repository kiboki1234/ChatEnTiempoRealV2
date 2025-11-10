import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import '../App.css';

const RoomManager = ({ username, onJoinRoom, currentRoom }) => {
    const [rooms, setRooms] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomType, setRoomType] = useState('text');
    const [maxParticipants, setMaxParticipants] = useState(5);
    const [pinToJoin, setPinToJoin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [showLink, setShowLink] = useState(false);


    useEffect(() => {
        // Cargar salas existentes
        fetch(`${process.env.REACT_APP_SOCKET_SERVER_URL}/api/rooms`)
            .then(response => response.json())
            .then(data => setRooms(data))
            .catch(err => console.error('Error loading rooms:', err));

        // Escuchar eventos de sala
        socket.on('roomCreated', (room) => {
            if (room.autoJoin) {
                onJoinRoom(room.pin);
            } else {
                setRooms(prev => [...prev.filter(r => r.pin !== room.pin), room]);
                setSuccess(`Nueva sala creada: ${room.name} (PIN: ${room.pin})`);
                setTimeout(() => setSuccess(''), 5000);
            }
        });

        socket.on('roomError', (data) => {
            setError(data.message);
            setTimeout(() => setError(''), 5000);
        });

        socket.on('userJoined', ({ participants }) => {
            // Actualizar la lista de participantes en la sala actual
            setRooms(prev => 
                prev.map(room => 
                    room.pin === currentRoom 
                        ? { ...room, participants } 
                        : room
                )
            );
        });

        socket.on('userLeft', ({ participants }) => {
            // Actualizar la lista de participantes en la sala actual
            setRooms(prev => 
                prev.map(room => 
                    room.pin === currentRoom 
                        ? { ...room, participants } 
                        : room
                )
            );
        });

        return () => {
            socket.off('roomCreated');
            socket.off('roomError');
            socket.off('userJoined');
            socket.off('userLeft');
        };
    }, [currentRoom, onJoinRoom]);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!roomName.trim()) {
            setError('El nombre de la sala es obligatorio');
            return;
        }

        const newRoom = {
            name: roomName,
            type: roomType,
            maxParticipants: parseInt(maxParticipants, 10),
            username,
            autoJoin: false
        };

        // Escuchar el evento de sala creada
        const onRoomCreated = (room) => {
            if (room.autoJoin) return; 
            
            // Generar el enlace de la sala con el PIN correcto
            const roomLink = `${window.location.origin}?room=${encodeURIComponent(room.name)}&pin=${room.pin}`;
            setGeneratedLink(roomLink);
            setShowLink(true);
            
            // Limpiar el listener después de usarlo
            socket.off('roomCreated', onRoomCreated);
        };

        // Suscribirse al evento de sala creada
        socket.on('roomCreated', onRoomCreated);

        // Emitir el evento para crear la sala (ahora incluye username)
        socket.emit('createRoom', {
            ...newRoom,
            username: username // Agregar username del usuario actual
        });

        setRoomName('');
        setRoomType('text');
        setMaxParticipants(5);
        setShowCreateForm(false);
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (!pinToJoin.trim()) {
            setError('El PIN de la sala es obligatorio');
            return;
        }
        
        console.log('Attempting to join room with PIN:', pinToJoin);
        onJoinRoom(pinToJoin);
        setPinToJoin('');
        setShowJoinForm(false);
    };

    // Add this new function to handle joining from the room list
    const handleJoinRoomFromList = (pin) => {
        console.log('Attempting to join room with PIN from list:', pin);
        onJoinRoom(pin);
    };

    // Check if user is a guest
    const isGuest = username && username.startsWith('guest_');

    return (
        <div className="room-manager">
            <h2>Gestión de Salas</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            {isGuest && (
                <div className="info-message" style={{
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    border: '1px solid #ffeeba'
                }}>
                    👻 <strong>Modo Invitado:</strong> Solo puedes acceder al Chat General. 
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        localStorage.clear();
                        window.location.reload();
                    }} style={{ color: '#004085', textDecoration: 'underline', marginLeft: '5px' }}>
                        Regístrate
                    </a> para crear y unirte a salas privadas.
                </div>
            )}
            
            <div className="room-actions">
                <button 
                    onClick={() => {
                        if (isGuest) {
                            setError('Los invitados no pueden crear salas. Por favor, regístrate.');
                            setTimeout(() => setError(''), 3000);
                            return;
                        }
                        setShowCreateForm(!showCreateForm);
                        setShowJoinForm(false);
                    }}
                    className="room-button"
                    disabled={isGuest}
                    style={isGuest ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    {showCreateForm ? 'Cancelar' : 'Crear Sala'}
                </button>
                <button 
                    onClick={() => {
                        if (isGuest) {
                            setError('Los invitados no pueden unirse a salas privadas. Por favor, regístrate.');
                            setTimeout(() => setError(''), 3000);
                            return;
                        }
                        setShowJoinForm(!showJoinForm);
                        setShowCreateForm(false);
                    }}
                    className="room-button"
                    disabled={isGuest}
                    style={isGuest ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    {showJoinForm ? 'Cancelar' : 'Unirse a Sala'}
                </button>
                <button 
                    onClick={() => onJoinRoom('general')}
                    className={`room-button ${currentRoom === 'general' ? 'active' : ''}`}
                >
                    Chat General
                </button>
            </div>
            
            {showCreateForm && !isGuest && (
                <form onSubmit={handleCreateRoom} className="room-form">
                    <h3>Crear Nueva Sala</h3>
                    <div className="form-group">
                        <label>Nombre de la Sala:</label>
                        <input 
                            type="text" 
                            value={roomName} 
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Nombre de la sala"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Tipo de Sala:</label>
                        <select 
                            value={roomType} 
                            onChange={(e) => setRoomType(e.target.value)}
                            className="room-type-select"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '2px solid #667eea',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                color: '#333',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <option value="text">📝 Texto - Solo mensajes de texto</option>
                            <option value="multimedia">🎨 Multimedia - Texto + Archivos (imágenes, PDFs, etc.)</option>
                        </select>
                        <small style={{ 
                            display: 'block', 
                            marginTop: '8px', 
                            color: '#666',
                            fontSize: '12px',
                            lineHeight: '1.4'
                        }}>
                            {roomType === 'text' 
                                ? '✓ Solo mensajes de texto encriptados' 
                                : '✓ Mensajes de texto + Subida de archivos con detección de esteganografía y verificación de seguridad'}
                        </small>
                    </div>
                    <div className="form-group">
                        <label>Máximo de Participantes:</label>
                        <input 
                            type="number" 
                            value={maxParticipants} 
                            onChange={(e) => setMaxParticipants(e.target.value)}
                            min="2"
                            max="20"
                            required
                        />
                    </div>
                    <button type="submit" className="submit-button">Crear Sala</button>
                </form>
            )}
            
            {showLink && (
                <div className="room-form" style={{ marginTop: '20px' }}>
                    <h3>¡Sala Creada!</h3>
                    <p>Comparte este enlace para invitar a otros:</p>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input 
                            type="text" 
                            value={generatedLink} 
                            readOnly
                            style={{ flex: 1, padding: '8px' }}
                        />
                        <button 
                            className="room-button"
                            onClick={() => {
                                navigator.clipboard.writeText(generatedLink);
                                setSuccess('¡Enlace copiado al portapapeles!');
                                setTimeout(() => setSuccess(''), 3000);
                            }}
                        >
                            Copiar
                        </button>
                    </div>
                    <p style={{ fontSize: '0.9em', marginBottom: '10px' }}>
                        O comparte el PIN: <strong>{new URLSearchParams(generatedLink.split('?')[1]).get('pin')}</strong>
                    </p>
                    <button 
                        className="room-button"
                        onClick={() => setShowLink(false)}
                    >
                        Cerrar
                    </button>
                </div>
            )}
            
            {showJoinForm && !isGuest && (
                <form onSubmit={handleJoinRoom} className="room-form">
                    <h3>Unirse a una Sala</h3>
                    <div className="form-group">
                        <label>PIN de la Sala:</label>
                        <input 
                            type="text" 
                            value={pinToJoin} 
                            onChange={(e) => setPinToJoin(e.target.value)}
                            placeholder="Ingresa el PIN de 6 dígitos"
                            pattern="[0-9]{6}"
                            title="El PIN debe tener 6 dígitos"
                            required
                        />
                    </div>
                    <button type="submit" className="submit-button">Unirse</button>
                </form>
            )}
            
            <div className="rooms-list">
                <h3>Salas Disponibles</h3>

                {isGuest ? (
                    <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#666'
                    }}>
                        <p>👻 Los invitados solo tienen acceso al Chat General</p>
                        <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
                            <a href="#" onClick={(e) => {
                                e.preventDefault();
                                localStorage.clear();
                                window.location.reload();
                            }} style={{ color: '#007bff', textDecoration: 'underline' }}>
                                Regístrate aquí
                            </a> para ver y unirte a salas privadas
                        </p>
                    </div>
                ) : rooms.length === 0 ? (
                    <p>No hay salas disponibles</p>
                ) : (
                    <ul>
                        {rooms.map(room => (
                            <li key={room.pin} className={`room-item ${currentRoom === room.pin ? 'active' : ''}`}>
                                <div className="room-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div>
                                            <span className="room-name">{room.name}</span>
                                            <div style={{ fontSize: '0.85em', color: '#888', marginTop: '4px' }}>
                                                {room.type === 'multimedia' ? '🎨 Multimedia' : '📝 Texto'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="room-pin" style={{ 
                                                fontSize: '0.9em', 
                                                fontWeight: 'bold',
                                                color: '#667eea',
                                                marginBottom: '4px'
                                            }}>
                                                📌 PIN: {room.pin}
                                            </div>
                                            <span className="room-participants">
                                                {room.participants ? room.participants.length : 0}/{room.maxParticipants} usuarios
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleJoinRoomFromList(room.pin)}
                                    className="join-room-button"
                                    style={{
                                        marginTop: '10px',
                                        padding: '8px 16px',
                                        backgroundColor: currentRoom === room.pin ? '#ccc' : '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: currentRoom === room.pin ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9em',
                                        width: '100%',
                                        transition: 'all 0.3s ease'
                                    }}
                                    disabled={currentRoom === room.pin}
                                >
                                    {currentRoom === room.pin ? '✓ Ya estás en esta sala' : 'Unirse a la sala'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default RoomManager;