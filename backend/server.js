const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
require('dotenv').config();

// Utils
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');

// Services
const encryptionService = require('./services/encryptionService');
const roomController = require('./controllers/roomController');
const UserService = require('./services/userService');
const quarantineService = require('./services/quarantineService');

// Middlewares
const { generalLimiter } = require('./middlewares/rateLimitMiddleware');

// Rutas
const chatRoutes = require('./routes/chatRoutes');
const roomRoutes = require('./routes/roomRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const userAuthRoutes = require('./routes/userAuthRoutes');
const securityRoutes = require('./routes/securityRoutes');
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
app.use('/api/security', securityRoutes); // Security management
app.use('/api', uploadMiddleware);

// Error handling middleware - debe ir AL FINAL
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize services
const initializeServices = async () => {
    await encryptionService.initialize();
    logger.info('Encryption service initialized');
    
    await quarantineService.init();
    logger.info('Quarantine service initialized');
    
    // Schedule cleanup tasks
    setInterval(async () => {
        try {
            await roomController.cleanupExpiredRooms();
            await UserService.cleanupInactiveRooms();
            logger.info('Cleanup completed');
        } catch (error) {
            logger.error('Error in scheduled cleanup', { error: error.message });
        }
    }, 60 * 60 * 1000); // 1 hour
    
    setInterval(async () => {
        try {
            await quarantineService.cleanOldFiles(30);
            logger.info('Quarantine cleanup completed');
        } catch (error) {
            logger.error('Error in quarantine cleanup', { error: error.message });
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    logger.info('Scheduled tasks configured');
};

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    logger.info('Connected to MongoDB');
    await initializeServices();
    logger.info('All services initialized successfully');
})
.catch((error) => {
    logger.error('Error connecting to MongoDB or initializing services', { error: error.message });
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    server.close(() => {
        logger.info('HTTP server closed');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Inicializar Socket.IO
const initializeSocket = require('./socket');
const io = initializeSocket(server);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Socket.IO server initialized');
}); 
