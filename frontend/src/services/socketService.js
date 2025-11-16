// src/services/socketService.js
import { io } from 'socket.io-client';

// Socket.IO uses HTTP protocol, not WebSocket directly
const socketServerUrl = process.env.REACT_APP_SOCKET_SERVER_URL || 'https://chatentiemporealv2.onrender.com';

console.log('🔌 Connecting to socket server at:', socketServerUrl);

const socket = io(socketServerUrl, {
    transports: ['polling', 'websocket'], // Try polling first (more reliable on free tier)
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 60000, // 60 seconds for Render free tier (may be sleeping)
    autoConnect: true,
    withCredentials: true,
    forceNew: false,
    upgrade: true
});

socket.on('connect', () => {
    console.log('✅ Socket connected with ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.log('🔄 Will attempt to reconnect...');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Reconnection attempt #${attemptNumber}...`);
});

socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
        // Server disconnected, manually reconnect
        socket.connect();
    }
});

export default socket;