import React, { useState, useEffect } from 'react';
import ChatBox from './components/ChatBox';
import CountdownTimer from './components/CountdownTimer';

const Disclaimer = ({ onAccept }) => {
    return (
        <div style={{ 
            padding: '25px', 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', 
            border: 'none',
            borderRadius: '20px', 
            margin: '40px auto', 
            maxWidth: '400px', 
            boxShadow: '0 20px 60px rgba(238, 90, 111, 0.4)',
            animation: 'disclaimerSlideIn 0.5s ease',
            color: 'white'
        }}>
            <style>
                {`
                    @keyframes disclaimerSlideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `}
            </style>
            <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '15px', fontWeight: '700' }}>
                ⚠️ Advertencia Importante
            </h2>
            <p style={{ fontSize: '15px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.95)', lineHeight: '1.6', marginBottom: '20px' }}>
                Whispers no se responsabiliza por el contenido compartido dentro del chat. El contenido compartido por los usuarios es responsabilidad exclusiva de cada usuario. Se recomienda mantener el respeto y evitar compartir información sensible o confidencial.
            </p>
            <button 
                onClick={onAccept} 
                style={{ 
                    padding: '12px 32px', 
                    marginTop: '10px', 
                    background: 'white',
                    color: '#ee5a6f', 
                    border: 'none', 
                    borderRadius: '25px', 
                    cursor: 'pointer', 
                    fontWeight: '700',
                    fontSize: '16px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                }}
                onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                }}
            >
                Entiendo y Acepto
            </button>
        </div>
    );
};

const App = () => {
    const [accepted, setAccepted] = useState(false);
    const [roomPin, setRoomPin] = useState(null);
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        const hasAccepted = localStorage.getItem('acceptedDisclaimer');
        if (hasAccepted) {
            setAccepted(true);
        }

        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const pin = urlParams.get('pin');
        const name = urlParams.get('room');

        if (pin) {
            setRoomPin(pin);
            setRoomName(name || 'Sala privada');
            // Aceptar automáticamente el disclaimer si se accede desde un enlace
            if (!hasAccepted) {
                handleAccept();
            }
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('acceptedDisclaimer', 'true');
        setAccepted(true);
    };

    // Efecto para manejar la conexión a la sala cuando se tienen los datos necesarios
    useEffect(() => {
        if (accepted && roomPin) {
            // usando el roomPin y roomName
            console.log(`Uniéndose automáticamente a la sala: ${roomName} (${roomPin})`);
        }
    }, [accepted, roomPin, roomName]);

    return (
        <div>
            {accepted ? (
                <>
                        <CountdownTimer />
                    <ChatBox initialRoomPin={roomPin} />
                    <div style={{ 
                        padding: '15px 20px', 
                        marginTop: '25px', 
                        textAlign: 'center', 
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        border: '2px solid rgba(102, 126, 234, 0.2)',
                        borderRadius: '15px',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                        animation: 'slideUp 0.5s ease'
                    }}>
                        <p style={{ 
                            fontSize: '15px', 
                            color: '#667eea',
                            margin: 0,
                            fontWeight: '600'
                        }}>
                            ✨ <strong>Nueva funcionalidad:</strong> Salas de chat privadas con PIN
                        </p>
                    </div>
                </>
            ) : (
                <Disclaimer onAccept={handleAccept} />
            )}
            <footer style={{ 
                textAlign: 'center', 
                marginTop: '30px', 
                padding: '20px', 
                fontSize: '13px', 
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)'
            }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: '600' }}>
                    &copy; {new Date().getFullYear()} Kibotech. Todos los derechos reservados.
                </p>
                <p style={{ margin: '0', fontSize: '12px', opacity: '0.8' }}>
                    Desarrollado con ❤️ para la comunidad
                </p>
            </footer>
        </div>
    );
};

export default App;
