import React, { useState, useEffect } from 'react';
import TwoFactorSetup from './TwoFactorSetup';
import axios from 'axios';
import '../styles/AdminPanel.css';

function AdminPanel({ userToken, userRole, onClose }) {
    const [activeTab, setActiveTab] = useState('security');
    const [show2FA, setShow2FA] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000';

    useEffect(() => {
        checkTwoFactorStatus();
    }, []);

    const checkTwoFactorStatus = async () => {
        try {
            setLoading(true);
            const baseRoute = userRole === 'admin' ? '/api/auth' : '/api/user-auth';
            const response = await axios.get(`${API_URL}${baseRoute}/verify`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const userData = response.data.user || response.data.admin || response.data;
            setTwoFactorEnabled(userData.twoFactorEnabled || false);
            console.log('✅ Admin Panel - 2FA Status:', userData.twoFactorEnabled);
        } catch (err) {
            console.error('Error checking 2FA status:', err);
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
                        <button 
                            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stats')}
                        >
                            📊 Estadísticas
                        </button>
                    )}
                </div>

                <div className="admin-content">
                    {activeTab === 'security' && (
                        <div className="security-section">
                            <h3>Seguridad de la Cuenta</h3>
                            
                            <div className="security-option">
                                <div className="option-info">
                                    <h4>🔐 Autenticación de Dos Factores (2FA)</h4>
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
                                </div>
                                <button 
                                    className="config-button"
                                    onClick={() => setShow2FA(true)}
                                    disabled={loading}
                                >
                                    {twoFactorEnabled ? 'Gestionar 2FA' : 'Configurar 2FA'}
                                </button>
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
