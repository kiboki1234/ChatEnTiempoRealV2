import React from 'react';
import ReactDOM from 'react-dom/client'; // Importar createRoot desde ReactDOM
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')); // Crear root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
          console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
          console.log('Service Worker registro fallido:', error);
      });
}
