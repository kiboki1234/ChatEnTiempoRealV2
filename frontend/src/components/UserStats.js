import React, { useState, useEffect } from 'react';
import socket from '../services/socketService';
import '../styles/UserStats.css';

const UserStats = ({ username }) => {
    const [stats, setStats] = useState(null);
    const [myRooms, setMyRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (!username) return;

        // Solicitar estadísticas del usuario
        socket.emit('getUserStats', { username });
        socket.emit('getMyRooms', { username });

        // Escuchar respuestas
        socket.on('userStats', (data) => {
            setStats(data);
            setLoading(false);
        });

        socket.on('myRooms', (data) => {
            setMyRooms(data.activeRooms || []);
        });

        socket.on('statsError', (error) => {
            console.error('Error getting stats:', error);
            setLoading(false);
        });

        // Actualizar stats cuando se crea una sala
        socket.on('roomCreated', () => {
            socket.emit('getUserStats', { username });
            socket.emit('getMyRooms', { username });
        });

        // Actualizar stats cuando se cierra una sala
        socket.on('roomClosedSuccess', () => {
            socket.emit('getUserStats', { username });
            socket.emit('getMyRooms', { username });
        });

        return () => {
            socket.off('userStats');
            socket.off('myRooms');
            socket.off('statsError');
        };
    }, [username]);

    const handleCloseRoom = (pin) => {
        if (window.confirm('¿Estás seguro de cerrar esta sala?')) {
            socket.emit('closeRoom', { pin, username });
        }
    };

    if (!username || loading) {
        return null;
    }

    if (!stats) {
        return (
            <div className="user-stats">
                <p>Cargando estadísticas...</p>
            </div>
        );
    }

    const canCreateDetails = stats.canCreateRoomDetails || {};
    const isAdmin = stats.role === 'admin';

    return (
        <div className="user-stats">
            <div className="stats-header" onClick={() => setShowDetails(!showDetails)}>
                <h3>
                    👤 {username} 
                    {isAdmin && <span className="admin-badge">⭐ ADMIN</span>}
                </h3>
                <button className="toggle-button">
                    {showDetails ? '▼' : '▶'}
                </button>
            </div>

            {showDetails && (
                <div className="stats-content">
                    {/* Límites de creación */}
                    <div className="stats-section">
                        <h4>📊 Límites de Creación</h4>
                        
                        {isAdmin ? (
                            <div className="admin-info">
                                <p>✨ <strong>Privilegios ilimitados</strong></p>
                                <p>Puedes crear salas sin restricciones</p>
                            </div>
                        ) : (
                            <div className="limits-grid">
                                <div className="limit-item">
                                    <span className="limit-label">Salas Activas:</span>
                                    <span className={`limit-value ${stats.stats.activeRoomsCount >= 3 ? 'limit-reached' : ''}`}>
                                        {stats.stats.activeRoomsCount} / 3
                                    </span>
                                </div>
                                
                                {canCreateDetails.allowed ? (
                                    <>
                                        <div className="limit-item">
                                            <span className="limit-label">Disponibles:</span>
                                            <span className="limit-value success">
                                                {canCreateDetails.remainingRooms} salas
                                            </span>
                                        </div>
                                        <div className="limit-item">
                                            <span className="limit-label">Esta hora:</span>
                                            <span className="limit-value">
                                                {canCreateDetails.remainingThisHour} / 5
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="limit-warning">
                                        ⚠️ {canCreateDetails.reason}
                                        {canCreateDetails.resetIn && (
                                            <p>Resetea en {canCreateDetails.resetIn} minutos</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Estadísticas generales */}
                    <div className="stats-section">
                        <h4>📈 Estadísticas</h4>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Total Creadas:</span>
                                <span className="stat-value">{stats.stats.totalRoomsCreated}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Última Sala:</span>
                                <span className="stat-value">
                                    {stats.stats.lastRoomCreatedAt 
                                        ? new Date(stats.stats.lastRoomCreatedAt).toLocaleString()
                                        : 'Nunca'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Salas activas */}
                    {myRooms.length > 0 && (
                        <div className="stats-section">
                            <h4>🏠 Mis Salas Activas ({myRooms.length})</h4>
                            <div className="active-rooms-list">
                                {myRooms.map((room) => (
                                    <div key={room.pin} className="active-room-item">
                                        <div className="room-info">
                                            <span className="room-pin">📌 PIN: {room.pin}</span>
                                            <span className="room-created">
                                                Creada: {new Date(room.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleCloseRoom(room.pin)}
                                            className="close-room-button"
                                            title="Cerrar sala"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Botón de actualizar */}
                    <div className="stats-actions">
                        <button 
                            onClick={() => {
                                socket.emit('getUserStats', { username });
                                socket.emit('getMyRooms', { username });
                            }}
                            className="refresh-button"
                        >
                            🔄 Actualizar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserStats;
