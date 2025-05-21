import React, { useState, useEffect } from 'react';
import ChatBox from './components/ChatBox';
import CountdownTimer from './components/CountdownTimer';

const Disclaimer = ({ onAccept }) => {
    return (
        <div style={{ padding: '15px', textAlign: 'center', backgroundColor: '#ffebee', border: '2px solid #d32f2f', borderRadius: '10px', margin: '20px auto', width: '300px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ color: '#d32f2f', fontSize: '18px' }}>⚠️ Advertencia</h2>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#b71c1c' }}>
                Whispers no se responsabiliza por el contenido compartido dentro del chat. El contenido compartido por los usuarios es responsabilidad exclusiva de cada usuario. Se recomienda mantener el respeto y evitar compartir información sensible o confidencial.
            </p>
            <button onClick={onAccept} style={{ padding: '8px 16px', marginTop: '10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Aceptar
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
            // Aquí podrías agregar lógica para unirte automáticamente a la sala
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
                    <div style={{ padding: '10px', marginTop: '20px', textAlign: 'center', backgroundColor: '#f0f8ff', border: '1px solid #ccc', borderRadius: '8px' }}>
                        <p style={{ fontSize: '14px', color: '#555' }}>🛠️ Nueva funcionalidad: Salas de chat privadas con PIN</p>
                    </div>
                </>
            ) : (
                <Disclaimer onAccept={handleAccept} />
            )}
            <footer style={{ textAlign: 'center', marginTop: '20px', padding: '10px', fontSize: '12px', color: 'gray' }}>
                &copy; {new Date().getFullYear()} Kibotech. Todos los derechos reservados.
            </footer>
        </div>
    );
};

export default App;
