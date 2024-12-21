import React from 'react';
import ChatBox from './components/ChatBox';
import CountdownTimer from './components/CountdownTimer';

const App = () => {
    return (
        <div>
            <CountdownTimer />
            <ChatBox />
            <footer style={{ textAlign: 'center', marginTop: '20px', padding: '10px', fontSize: '12px', color: 'gray' }}>
                &copy; {new Date().getFullYear()} Kibotech. Todos los derechos reservados.
            </footer>
        </div>
    );
};

export default App;
