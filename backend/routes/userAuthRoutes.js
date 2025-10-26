const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const UserService = require('../services/userService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { body, validationResult } = require('express-validator');
const user2FAController = require('../controllers/user2FAController');
const { authenticateUser } = require('../middlewares/authMiddleware');

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

            // Create user with password
            const user = new User({
                username,
                password, // Will be hashed by the pre-save middleware
                role: 'user',
                ipAddress
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
                    createdAt: user.createdAt,
                    twoFactorEnabled: user.twoFactorEnabled
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
            const { username, password, twoFactorCode } = req.body;
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];

            console.log('🔐 User login attempt:', { username, hasPassword: !!password, has2FACode: !!twoFactorCode });

            // Find or create user
            let user = await User.findOne({ username });
            
            if (!user) {
                // Auto-register user on first login (simplified version)
                user = new User({
                    username,
                    password: password || undefined, // Solo guardar si se proporciona
                    role: 'user',
                    ipAddress
                });
                await user.save();

                console.log('✅ User auto-registered:', username);

                // Log auto-registration
                await AuditLog.createLog({
                    action: 'USER_AUTO_REGISTER',
                    userId: user._id.toString(),
                    username,
                    ipAddress,
                    userAgent,
                    details: {
                        reason: 'First time login',
                        hasPassword: !!password
                    }
                });
            } else {
                console.log('✅ User found:', { username, has2FA: user.twoFactorEnabled, hasPassword: !!user.password });
                
                // Si el usuario tiene contraseña, verificarla
                if (user.password && password) {
                    const isPasswordValid = await user.comparePassword(password);
                    if (!isPasswordValid) {
                        console.log('❌ Invalid password');
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }
                    console.log('✅ Password valid');
                }

                // Check 2FA if enabled
                if (user.twoFactorEnabled) {
                    console.log('🔐 2FA is enabled for this user');
                    if (!twoFactorCode) {
                        console.log('⚠️ 2FA code not provided, requesting it...');
                        // Usuario tiene 2FA activo pero no envió el código
                        return res.status(200).json({ 
                            requires2FA: true,
                            message: 'Por favor ingresa tu código de autenticación de dos factores'
                        });
                    }
                    
                    console.log('🔍 Verifying 2FA code...');
                    const verified = speakeasy.totp.verify({
                        secret: user.twoFactorSecret,
                        encoding: 'base32',
                        token: twoFactorCode,
                        window: 2
                    });
                    
                    if (!verified) {
                        console.log('❌ Invalid 2FA code');
                        return res.status(401).json({ 
                            error: 'Código 2FA inválido. Por favor verifica e intenta nuevamente.' 
                        });
                    }
                    console.log('✅ 2FA code verified successfully');
                }

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
                    role: user.role,
                    with2FA: user.twoFactorEnabled
                }
            });

            res.json({
                message: 'Login exitoso',
                user: {
                    username: user.username,
                    role: user.role,
                    stats: user.stats,
                    twoFactorEnabled: user.twoFactorEnabled
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

        const user = await User.findById(decoded.userId).select('-ipAddress -deviceFingerprint -password -twoFactorSecret');

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid token or inactive user' });
        }

        // Asegurar que el campo twoFactorEnabled exista
        if (user.twoFactorEnabled === undefined || user.twoFactorEnabled === null) {
            user.twoFactorEnabled = false;
            await user.save();
        }

        console.log('✅ User verify endpoint - user data:', {
            username: user.username,
            twoFactorEnabled: user.twoFactorEnabled,
            hasField: 'twoFactorEnabled' in user
        });

        res.json({
            valid: true,
            user: {
                username: user.username,
                role: user.role,
                stats: user.stats,
                twoFactorEnabled: user.twoFactorEnabled
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

// 2FA Routes for regular users (protected)
router.post('/2fa/setup', authenticateUser, user2FAController.setup2FA);
router.post('/2fa/enable', authenticateUser, user2FAController.enable2FA);
router.post('/2fa/disable', authenticateUser, user2FAController.disable2FA);
router.get('/2fa/status', authenticateUser, user2FAController.get2FAStatus);

module.exports = router;
