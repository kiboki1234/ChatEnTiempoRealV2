import React from 'react';
import ChatBox from './components/ChatBox';

const App = () => {
    return (
        <div>
            <ChatBox />
            <footer style={{ textAlign: 'center', marginTop: '20px', padding: '10px', fontSize: '12px', color: 'gray' }}>
                &copy; {new Date().getFullYear()} Kibotech. Todos los derechos reservados.
            </footer>
        </div>
    );
};

export default App;
