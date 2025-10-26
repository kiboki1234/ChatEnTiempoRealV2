import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import '../styles/TwoFactorSetup.css';

const TwoFactorSetup = ({ token, onClose, onUpdate, userRole }) => {
    const [step, setStep] = useState(1); // 1: inicio, 2: QR, 3: verificar, 4: éxito
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const API_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000';
    
    // Determinar la ruta base según el rol del usuario
    const getBaseRoute = () => {
        // userRole puede ser 'admin' o 'user'
        return userRole === 'admin' ? '/api/auth' : '/api/user-auth';
    };

    useEffect(() => {
        checkTwoFactorStatus();
    }, []);

    const checkTwoFactorStatus = async () => {
        try {
            const baseRoute = getBaseRoute();
            const response = await axios.get(`${API_URL}${baseRoute}/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Puede ser response.data.user o response.data.admin dependiendo del endpoint
            const userData = response.data.user || response.data.admin || response.data;
            setTwoFactorEnabled(userData.twoFactorEnabled || false);
            console.log('✅ 2FA Status:', userData.twoFactorEnabled);
        } catch (err) {
            console.error('Error checking 2FA status:', err);
            // Si hay error, asumimos que 2FA está desactivado
            setTwoFactorEnabled(false);
        }
    };

    const handleSetup2FA = async () => {
        setLoading(true);
        setError('');

        try {
            console.log('🔧 Setting up 2FA...');
            const baseRoute = getBaseRoute();
            const response = await axios.post(
                `${API_URL}${baseRoute}/2fa/setup`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { secret: secretKey, qrCode } = response.data;
            console.log('✅ 2FA setup successful, secret received');
            setSecret(secretKey);

            // Generar QR code como imagen
            const qrImageUrl = await QRCode.toDataURL(qrCode);
            setQrCodeUrl(qrImageUrl);
            
            setStep(2);
        } catch (err) {
            console.error('❌ Error setting up 2FA:', err);
            const errorMsg = err.response?.data?.error || 'Error al configurar 2FA. Inténtalo de nuevo.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Por favor ingresa un código de 6 dígitos');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('🔐 Enabling 2FA with code:', verificationCode);
            const baseRoute = getBaseRoute();
            await axios.post(
                `${API_URL}${baseRoute}/2fa/enable`,
                { twoFactorCode: verificationCode },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('✅ 2FA enabled successfully');
            setStep(4);
            setTwoFactorEnabled(true);
            
            // Notificar al componente padre
            if (onUpdate) onUpdate(true);

            // Cerrar automáticamente después de 2 segundos
            setTimeout(() => {
                if (onClose) onClose();
            }, 2000);
        } catch (err) {
            console.error('❌ Error enabling 2FA:', err);
            const errorMsg = err.response?.data?.error || 'Código inválido. Intenta de nuevo.';
            
            // Si dice "2FA not set up", dar instrucción clara
            if (errorMsg.includes('not set up')) {
                setError('❌ Error: El QR no se configuró correctamente. Por favor, vuelve al paso 1 y escanea el código QR nuevamente.');
                // Volver al paso 1 para reintentar
                setTimeout(() => {
                    setStep(1);
                    setSecret('');
                    setQrCodeUrl('');
                    setVerificationCode('');
                }, 3000);
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm('¿Estás seguro de que quieres desactivar la autenticación de dos factores?')) {
            return;
        }

        // eslint-disable-next-line no-alert
        const password = prompt('Por favor ingresa tu contraseña para confirmar (deja en blanco si no tienes contraseña):');
        if (password === null) return; // Usuario canceló

        setLoading(true);
        setError('');

        try {
            const baseRoute = getBaseRoute();
            await axios.post(
                `${API_URL}${baseRoute}/2fa/disable`,
                { password: password || '' }, // Enviar string vacío si no hay contraseña
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // eslint-disable-next-line no-alert
            alert('✅ 2FA desactivado exitosamente');
            setTwoFactorEnabled(false);
            
            if (onUpdate) onUpdate(false);
            if (onClose) onClose();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al desactivar 2FA';
            console.error('❌ Error disabling 2FA:', errorMsg);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="two-factor-modal">
            <div className="two-factor-container">
                <button className="close-button" onClick={onClose}>✕</button>
                
                <h2>🔐 Autenticación de Dos Factores (2FA)</h2>

                {error && <div className="error-message">{error}</div>}

                {/* Estado Actual */}
                <div className={`status-badge ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                    {twoFactorEnabled ? '✅ 2FA Activado' : '⚠️ 2FA Desactivado'}
                </div>

                {/* Si ya está activado, mostrar opción de desactivar */}
                {twoFactorEnabled && (
                    <div className="enabled-section">
                        <p>La autenticación de dos factores está activa en tu cuenta.</p>
                        <button 
                            className="disable-button" 
                            onClick={handleDisable2FA}
                            disabled={loading}
                        >
                            {loading ? 'Desactivando...' : 'Desactivar 2FA'}
                        </button>
                    </div>
                )}

                {/* Si no está activado, mostrar flujo de configuración */}
                {!twoFactorEnabled && (
                    <>
                        {/* Paso 1: Introducción */}
                        {step === 1 && (
                            <div className="step-container">
                                <div className="info-box">
                                    <h3>¿Qué es 2FA?</h3>
                                    <p>
                                        La autenticación de dos factores agrega una capa extra de seguridad 
                                        requiriendo un código temporal de tu teléfono además de tu contraseña.
                                    </p>
                                    <ul>
                                        <li>✅ Protege tu cuenta contra accesos no autorizados</li>
                                        <li>✅ Códigos únicos que cambian cada 30 segundos</li>
                                        <li>✅ Funciona con Google Authenticator, Authy, etc.</li>
                                    </ul>
                                </div>

                                <button 
                                    className="setup-button" 
                                    onClick={handleSetup2FA}
                                    disabled={loading}
                                >
                                    {loading ? 'Configurando...' : 'Comenzar Configuración'}
                                </button>
                            </div>
                        )}

                        {/* Paso 2: Mostrar QR */}
                        {step === 2 && (
                            <div className="step-container">
                                <h3>📱 Escanea el código QR</h3>
                                <p>Usa tu app de autenticación para escanear este código:</p>
                                
                                {qrCodeUrl && (
                                    <div className="qr-code-box">
                                        <img src={qrCodeUrl} alt="QR Code" />
                                    </div>
                                )}

                                <div className="secret-box">
                                    <p><strong>Código secreto manual:</strong></p>
                                    <code>{secret}</code>
                                    <button 
                                        className="copy-button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(secret);
                                            alert('✅ Código copiado al portapapeles');
                                        }}
                                    >
                                        📋 Copiar
                                    </button>
                                </div>

                                <div className="apps-info">
                                    <p><strong>Apps recomendadas:</strong></p>
                                    <ul>
                                        <li>Google Authenticator (iOS/Android)</li>
                                        <li>Microsoft Authenticator (iOS/Android)</li>
                                        <li>Authy (iOS/Android/Desktop)</li>
                                    </ul>
                                </div>

                                <button 
                                    className="next-button" 
                                    onClick={() => setStep(3)}
                                >
                                    Siguiente →
                                </button>
                            </div>
                        )}

                        {/* Paso 3: Verificar código */}
                        {step === 3 && (
                            <div className="step-container">
                                <h3>✅ Verifica el código</h3>
                                <p>Ingresa el código de 6 dígitos de tu app de autenticación:</p>

                                <input
                                    type="text"
                                    className="code-input"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength="6"
                                    autoFocus
                                />

                                <div className="button-group">
                                    <button 
                                        className="back-button" 
                                        onClick={() => setStep(2)}
                                    >
                                        ← Atrás
                                    </button>
                                    <button 
                                        className="verify-button" 
                                        onClick={handleEnable2FA}
                                        disabled={loading || verificationCode.length !== 6}
                                    >
                                        {loading ? 'Verificando...' : 'Activar 2FA'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Paso 4: Éxito */}
                        {step === 4 && (
                            <div className="step-container success">
                                <div className="success-icon">🎉</div>
                                <h3>¡2FA Activado!</h3>
                                <p>Tu cuenta ahora está protegida con autenticación de dos factores.</p>
                                <p className="success-note">
                                    La próxima vez que inicies sesión, se te pedirá un código de verificación.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TwoFactorSetup;
