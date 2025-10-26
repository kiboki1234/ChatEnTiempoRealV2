const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserService = require('../services/userService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Register new user
router.post(
    '/register',
    [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('La contraseña debe tener al menos 6 caracteres')
    ],
    validate,
    async (req, res) => {
        try {
            const { username, password } = req.body;
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];

            // Check if username already exists
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ 
                    error: 'El nombre de usuario ya está en uso' 
                });
            }

            // Create user (note: we're not storing passwords for regular users in this simple version)
            // In production, you should hash passwords with bcrypt
            const user = new User({
                username,
                role: 'user',
                ipAddress,
                // For now, we'll just track users by username
                // In production, add password hashing here
            });

            await user.save();

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user._id,
                    username: user.username,
                    role: user.role
                },
                process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
                { expiresIn: '30d' }
            );

            // Log registration
            await AuditLog.createLog({
                action: 'REGISTER',
                userId: user._id.toString(),
                username,
                ipAddress,
                userAgent,
                details: {
                    role: user.role
                }
            });

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                user: {
                    username: user.username,
                    role: user.role,
                    createdAt: user.createdAt
                },
                token
            });
        } catch (error) {
            console.error('Error in registration:', error);
            res.status(500).json({ error: 'Error al registrar usuario' });
        }
    }
);

// Login user
router.post(
    '/login',
    [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Nombre de usuario inválido')
    ],
    validate,
    async (req, res) => {
        try {
            const { username } = req.body;
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];

            // Find or create user
            let user = await User.findOne({ username });
            
            if (!user) {
                // Auto-register user on first login (simplified version)
                user = new User({
                    username,
                    role: 'user',
                    ipAddress
                });
                await user.save();

                // Log auto-registration
                await AuditLog.createLog({
                    action: 'USER_AUTO_REGISTER',
                    userId: user._id.toString(),
                    username,
                    ipAddress,
                    userAgent,
                    details: {
                        reason: 'First time login'
                    }
                });
            } else {
                // Update last activity and IP
                user.lastActivity = new Date();
                user.ipAddress = ipAddress;
                await user.save();
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user._id,
                    username: user.username,
                    role: user.role
                },
                process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
                { expiresIn: '30d' }
            );

            // Log login
            await AuditLog.createLog({
                action: 'LOGIN',
                userId: user._id.toString(),
                username,
                ipAddress,
                userAgent,
                details: {
                    role: user.role
                }
            });

            res.json({
                message: 'Login exitoso',
                user: {
                    username: user.username,
                    role: user.role,
                    stats: user.stats
                },
                token
            });
        } catch (error) {
            console.error('Error in login:', error);
            res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }
);

// Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
        );

        const user = await User.findById(decoded.userId).select('-ipAddress -deviceFingerprint');

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid token or inactive user' });
        }

        res.json({
            valid: true,
            user: {
                username: user.username,
                role: user.role,
                stats: user.stats
            }
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
        );

        const stats = await UserService.getUserStats(decoded.username);

        res.json(stats);
    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(401).json({ error: 'Error al obtener información del usuario' });
    }
});

module.exports = router;
