import React, { useState, useEffect } from 'react';
import TwoFactorSetup from './TwoFactorSetup';
import SecurityPanel from './SecurityPanel';
import axios from 'axios';
import '../styles/AdminPanel.css';

function AdminPanel({ userToken, userRole, onClose }) {
    const [activeTab, setActiveTab] = useState('security');
    const [show2FA, setShow2FA] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'https://chatentiemporealv2.onrender.com';
    const isGuest = localStorage.getItem('isGuest') === 'true';

    useEffect(() => {
        console.log('🔍 AdminPanel - Token:', userToken ? 'Presente' : 'Ausente');
        console.log('🔍 AdminPanel - Role:', userRole);
        console.log('🔍 AdminPanel - Is Guest:', isGuest);
        
        if (isGuest) {
            setError('Los invitados no pueden configurar 2FA. Por favor, crea una cuenta.');
            setLoading(false);
            return;
        }
        
        if (userToken) {
            checkTwoFactorStatus();
        } else {
            setError('No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.');
            setLoading(false);
        }
    }, [userToken, isGuest]);

    const checkTwoFactorStatus = async () => {
        if (!userToken) {
            setError('Token no disponible');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            console.log('🔍 Verificando 2FA - Token:', userToken ? 'Presente' : 'Ausente');
            console.log('🔍 Verificando 2FA - Role:', userRole);
            
            const baseRoute = userRole === 'admin' ? '/api/auth' : '/api/user-auth';
            console.log('🔍 URL completa:', `${API_URL}${baseRoute}/verify`);
            
            const response = await axios.get(`${API_URL}${baseRoute}/verify`, {
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Respuesta del servidor:', response.data);
            
            const userData = response.data.user || response.data.admin || response.data;
            setTwoFactorEnabled(userData.twoFactorEnabled || false);
            console.log('✅ Admin Panel - 2FA Status:', userData.twoFactorEnabled);
        } catch (err) {
            console.error('❌ Error checking 2FA status:', err);
            console.error('❌ Error response:', err.response?.data);
            console.error('❌ Error status:', err.response?.status);
            
            let errorMessage = 'Error al verificar el estado de 2FA';
            
            if (err.response) {
                // El servidor respondió con un código de error
                if (err.response.status === 401) {
                    errorMessage = 'Token inválido o expirado. Por favor, cierra sesión e inicia sesión nuevamente.';
                } else if (err.response.status === 403) {
                    errorMessage = 'No tienes permisos para acceder a esta funcionalidad.';
                } else if (err.response.status === 404) {
                    errorMessage = 'Usuario no encontrado. Verifica tu sesión.';
                } else {
                    errorMessage = err.response.data?.error || err.response.data?.message || errorMessage;
                }
            } else if (err.request) {
                // La petición se hizo pero no hubo respuesta
                errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
            } else {
                // Algo pasó al configurar la petición
                errorMessage = err.message || errorMessage;
            }
            
            setError(errorMessage);
            setTwoFactorEnabled(false);
        } finally {
            setLoading(false);
        }
    };

    const handle2FAUpdate = (enabled) => {
        console.log('2FA actualizado a:', enabled);
        setTwoFactorEnabled(enabled);
        setShow2FA(false);
    };

    return (
        <div className="admin-panel-modal">
            <div className="admin-panel-container">
                <button className="close-button" onClick={onClose}>×</button>
                
                <h2>⚙️ {userRole === 'admin' ? 'Panel de Administración' : 'Configuración de Usuario'}</h2>
                
                <div className="admin-tabs">
                    <button 
                        className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        🔒 Seguridad
                    </button>
                    <button 
                        className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        ⚙️ Configuración
                    </button>
                    {userRole === 'admin' && (
                        <>
                            <button 
                                className={`tab ${activeTab === 'filesecurity' ? 'active' : ''}`}
                                onClick={() => setActiveTab('filesecurity')}
                            >
                                🛡️ Seguridad de Archivos
                            </button>
                            <button 
                                className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
                                onClick={() => setActiveTab('stats')}
                            >
                                📊 Estadísticas
                            </button>
                        </>
                    )}
                </div>

                <div className="admin-content">
                    {activeTab === 'security' && (
                        <div className="security-section">
                            <h3>Seguridad de la Cuenta</h3>
                            
                            <div className="security-option">
                                <div className="option-info">
                                    <h4>🔐 Autenticación de Dos Factores (2FA)</h4>
                                    {isGuest ? (
                                        <div className="info-message-2fa">
                                            <p>👻 Los invitados no pueden configurar 2FA</p>
                                            <p style={{ fontSize: '13px', marginTop: '8px', opacity: '0.9' }}>
                                                Crea una cuenta para acceder a funcionalidades de seguridad avanzadas.
                                            </p>
                                        </div>
                                    ) : !userToken ? (
                                        <div className="error-message-2fa">
                                            <p>⚠️ No se encontró el token de autenticación</p>
                                            <p style={{ fontSize: '13px', marginTop: '8px', opacity: '0.9' }}>
                                                Por favor, cierra sesión e inicia sesión nuevamente para acceder a esta funcionalidad.
                                            </p>
                                        </div>
                                    ) : error ? (
                                        <div className="error-message-2fa">
                                            <p>⚠️ {error}</p>
                                            <button 
                                                className="retry-button"
                                                onClick={checkTwoFactorStatus}
                                            >
                                                🔄 Reintentar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p>
                                                Agrega una capa adicional de seguridad a tu cuenta 
                                                requiriendo un código de verificación de tu teléfono.
                                            </p>
                                            {loading ? (
                                                <p className="status-loading">⏳ Verificando estado...</p>
                                            ) : (
                                                <p className={`status-badge ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                                                    {twoFactorEnabled ? '✅ 2FA Activado' : '⚠️ 2FA Desactivado'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                                {!isGuest && userToken && !error && (
                                    <button 
                                        className="config-button"
                                        onClick={() => setShow2FA(true)}
                                        disabled={loading}
                                    >
                                        {twoFactorEnabled ? 'Gestionar 2FA' : 'Configurar 2FA'}
                                    </button>
                                )}
                            </div>

                            <div className="security-option">
                                <div className="option-info">
                                    <h4>🔑 Cambiar Contraseña</h4>
                                    <p>Actualiza tu contraseña regularmente para mayor seguridad.</p>
                                </div>
                                <button className="config-button">
                                    Cambiar
                                </button>
                            </div>

                            <div className="security-option">
                                <div className="option-info">
                                    <h4>📋 Registro de Actividad</h4>
                                    <p>Revisa el historial de actividad de tu cuenta.</p>
                                </div>
                                <button className="config-button">
                                    Ver Registro
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="settings-section">
                            <h3>Configuración General</h3>
                            <p>Próximamente...</p>
                        </div>
                    )}

                    {activeTab === 'filesecurity' && userRole === 'admin' && (
                        <SecurityPanel />
                    )}

                    {activeTab === 'stats' && (
                        <div className="stats-section">
                            <h3>Estadísticas</h3>
                            <p>Próximamente...</p>
                        </div>
                    )}
                </div>
            </div>

            {show2FA && (
                <TwoFactorSetup
                    token={userToken}
                    userRole={userRole}
                    onClose={() => {
                        setShow2FA(false);
                        checkTwoFactorStatus(); // Refrescar estado al cerrar
                    }}
                    onUpdate={handle2FAUpdate}
                />
            )}
        </div>
    );
}

export default AdminPanel;
