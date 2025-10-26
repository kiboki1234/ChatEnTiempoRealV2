import React, { useState } from 'react';
import '../styles/AuthModal.css';

const AuthModal = ({ onAuthSuccess, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/user-auth/login' : '/api/user-auth/register';
            const apiUrl = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000';

            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la autenticación');
            }

            // Guardar token en localStorage
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userRole', data.user.role);

            // Llamar callback de éxito
            onAuthSuccess({
                username: data.user.username,
                role: data.user.role,
                token: data.token
            });

        } catch (err) {
            setError(err.message || 'Error al autenticar');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestAccess = () => {
        // Generar username aleatorio para invitado
        const guestUsername = `guest_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem('username', guestUsername);
        localStorage.setItem('userRole', 'user');
        localStorage.setItem('isGuest', 'true');
        
        onAuthSuccess({
            username: guestUsername,
            role: 'user',
            isGuest: true
        });
    };

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal">
                <button className="close-button" onClick={onClose}>✕</button>
                
                <h2>{isLogin ? '🔐 Iniciar Sesión' : '✨ Crear Cuenta'}</h2>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>👤 Nombre de Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingresa tu usuario"
                            required
                            minLength={3}
                            maxLength={30}
                            pattern="[a-zA-Z0-9_-]+"
                            title="Solo letras, números, guiones y guiones bajos"
                        />
                        <small>3-30 caracteres (letras, números, _, -)</small>
                    </div>

                    <div className="form-group">
                        <label>🔒 Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isLogin ? "Ingresa tu contraseña" : "Mínimo 6 caracteres"}
                            required={!isLogin}
                            minLength={isLogin ? 1 : 6}
                        />
                        <small>{isLogin ? "Opcional para login rápido" : "Mínimo 6 caracteres"}</small>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? '⏳ Procesando...' : (isLogin ? '🚀 Entrar' : '✨ Registrarse')}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>o</span>
                </div>

                <button 
                    className="guest-button"
                    onClick={handleGuestAccess}
                    type="button"
                >
                    👻 Continuar como Invitado
                </button>

                <div className="auth-toggle">
                    {isLogin ? (
                        <>
                            ¿No tienes cuenta?{' '}
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsLogin(false);
                                    setError('');
                                }}
                            >
                                Regístrate aquí
                            </button>
                        </>
                    ) : (
                        <>
                            ¿Ya tienes cuenta?{' '}
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsLogin(true);
                                    setError('');
                                }}
                            >
                                Inicia sesión
                            </button>
                        </>
                    )}
                </div>

                <div className="auth-info">
                    <h4>ℹ️ Información:</h4>
                    <ul>
                        <li>✅ <strong>Cuenta registrada:</strong> Guarda tu progreso y estadísticas</li>
                        <li>👻 <strong>Invitado:</strong> Acceso temporal sin registro</li>
                        <li>⭐ <strong>Límites:</strong> 3 salas activas, 5 salas por hora</li>
                        <li>🔐 <strong>Admins:</strong> Sin límites de salas</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
