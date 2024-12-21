import React from 'react';
import ReactDOM from 'react-dom/client'; // Importar createRoot desde ReactDOM
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')); // Crear root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
