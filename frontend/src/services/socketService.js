// src/services/socketService.js
import { io } from 'socket.io-client';

// Ensure we're using the correct WebSocket protocol (ws/wss) based on the current protocol
let socketServerUrl = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000';

// Convert http/https to ws/wss
if (socketServerUrl.startsWith('http')) {
    socketServerUrl = socketServerUrl.replace(/^http/, 'ws');
}

console.log('Connecting to socket server at:', socketServerUrl);

const socket = io(socketServerUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    secure: true,
    rejectUnauthorized: false // Only for development, remove in production with proper certificates
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