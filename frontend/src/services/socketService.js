// src/services/socketService.js
import { io } from 'socket.io-client';

// Socket.IO uses HTTP protocol, not WebSocket directly
const socketServerUrl = process.env.REACT_APP_SOCKET_SERVER_URL || 'https://chatentiemporealv2.onrender.com';

console.log('Connecting to socket server at:', socketServerUrl);

const socket = io(socketServerUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    withCredentials: true
});

socket.on('connect', () => {
    console.log('Socket connected with ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

export default socket;