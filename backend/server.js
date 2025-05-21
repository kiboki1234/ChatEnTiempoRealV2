const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Rutas
const chatRoutes = require('./routes/chatRoutes');
const roomRoutes = require('./routes/roomRoutes');

// Inicializar Express
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/chat', chatRoutes);
app.use('/api/rooms', roomRoutes);

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor HTTP iniciado en http://localhost:${PORT}`);
});

// Cargar Socket.IO por separado
require('./socket')(server); // Pasa el servidor HTTP al socket 
