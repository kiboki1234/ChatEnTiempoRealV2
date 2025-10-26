const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
require('dotenv').config();

// Services
const encryptionService = require('./services/encryptionService');
const roomController = require('./controllers/roomController');
const UserService = require('./services/userService');

// Middlewares
const { generalLimiter } = require('./middlewares/rateLimitMiddleware');

// Rutas
const chatRoutes = require('./routes/chatRoutes');
const roomRoutes = require('./routes/roomRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const userAuthRoutes = require('./routes/userAuthRoutes');
const uploadMiddleware = require('./middlewares/uploadMiddleware');

// Inicializar Express
const app = express();
const server = http.createServer(app);

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://chat-en-tiempo-real-v2.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
}));

// Rate limiting
app.use(generalLimiter);

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (important for IP detection behind load balancers)
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rutas
app.use('/api/chat', chatRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes); // Admin auth
app.use('/api/user-auth', userAuthRoutes); // User auth
app.use('/api/users', userRoutes);
app.use('/api', uploadMiddleware);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
    
    res.status(err.status || 500).json({
        error: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize services
const initializeServices = async () => {
    try {
        // Initialize encryption service
        await encryptionService.initialize();
        console.log('✓ Encryption service initialized');
        
        // Schedule cleanup of expired rooms and inactive users (every hour)
        setInterval(async () => {
            try {
                await roomController.cleanupExpiredRooms();
                await UserService.cleanupInactiveRooms();
                console.log('✓ Cleanup completed');
            } catch (error) {
                console.error('Error in scheduled cleanup:', error);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        console.log('✓ Scheduled tasks configured');
    } catch (error) {
        console.error('Error initializing services:', error);
        throw error;
    }
};

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('✓ Connected to MongoDB');
    return initializeServices();
})
.then(() => {
    console.log('✓ All services initialized successfully');
})
.catch((error) => {
    console.error('✗ Error connecting to MongoDB or initializing services:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Cargar Socket.IO por separado
require('./socket')(server); // Pasa el servidor HTTP al socket 
