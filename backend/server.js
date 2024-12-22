const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Rutas del chat
const chatRoutes = require('./routes/chatRoutes');

// Configuración de Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

app.use(cors());
app.use(express.json());

// Registrar rutas del chat
app.use('/api/chat', chatRoutes); // Asegúrate de usar el prefijo correcto

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Configuración de WebSocket
io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('sendMessage', async (data) => {
        const { createMessage } = require('./controllers/chatController');
        const message = await createMessage(data);
        io.emit('receiveMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
