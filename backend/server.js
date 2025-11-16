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

// Configurar keep-alive para prevenir timeouts en Render
server.keepAliveTimeout = 65000; // 65s (mayor que pingInterval de Socket.IO)
server.headersTimeout = 66000;   // 66s (mayor que keepAliveTimeout)

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
const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://chat-en-tiempo-real-v2.vercel.app',
    'https://chat-en-tiempo-real-v2.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked origin', { origin });
            callback(null, true); // Allow in production for now
        }
    },
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

// Health check endpoint (con keep-alive headers)
app.get('/health', (req, res) => {
    res.set({
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=1000'
    });
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: server.getConnections ? 'available' : 'unavailable'
    });
});

// Keep-alive endpoint (previene sleep en Render)
app.get('/api/keep-alive', (req, res) => {
    res.set({
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=1000'
    });
    res.status(200).json({ 
        status: 'alive',
        timestamp: Date.now()
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
    
    try {
        // Close HTTP server
        await new Promise((resolve) => {
            server.close(() => {
                logger.info('HTTP server closed');
                resolve();
            });
        });
        
        // Close MongoDB connection (no callback in Mongoose 8+)
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
    }
});

// Handle SIGINT (Ctrl+C) as well
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    
    try {
        await new Promise((resolve) => {
            server.close(() => {
                logger.info('HTTP server closed');
                resolve();
            });
        });
        
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
    }
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
    
    // Auto-ping interno para prevenir sleep en Render (solo en producción)
    if (process.env.NODE_ENV === 'production' && process.env.RENDER) {
        const SELF_PING_INTERVAL = 10 * 60 * 1000; // 10 minutos
        const selfPingTimer = setInterval(() => {
            const startTime = Date.now();
            http.get(`http://localhost:${PORT}/health`, (res) => {
                const latency = Date.now() - startTime;
                logger.info('Self-ping successful', { latency: `${latency}ms` });
            }).on('error', (err) => {
                logger.warn('Self-ping failed', { error: err.message });
            });
        }, SELF_PING_INTERVAL);
        
        // Limpiar timer en shutdown
        process.on('SIGTERM', () => {
            clearInterval(selfPingTimer);
        });
        
        logger.info('Self-ping mechanism enabled', { interval: '10 minutes' });
    }
}); 
