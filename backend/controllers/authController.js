const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { authWorkerPool } = require('../services/workerPool');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../utils/errorHandler');

// Register a new admin
const registerAdmin = asyncHandler(async (req, res) => {
    const { username, password, email } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
        throw new AppError('User already exists', 400);
    }
    
    const user = new User({ username, password, email, role: 'admin' });
    await user.save();
    
    await AuditLog.create({
        action: 'ADMIN_ACTION',
        userId: user._id.toString(),
        username: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { action: 'REGISTER' }
    });
    
    logger.info('Admin registered', { username, userId: user._id });
    
    res.status(201).json({ 
        message: 'Admin registered successfully',
        userId: user._id 
    });
});

// Login
const loginAdmin = asyncHandler(async (req, res) => {
    const { username, password, twoFactorCode } = req.body;
    
    logger.info('Login attempt', { username, has2FA: !!twoFactorCode });
    
    const user = await User.findOne({ username });
    if (!user) {
        logger.warn('Login failed: user not found', { username });
        throw new AppError('Invalid credentials', 401);
    }
    
    // Verify password using worker thread
    const passwordCheckResult = await authWorkerPool.executeTask({
        operation: 'comparePassword',
        data: { password, hash: user.password }
    });
    
    if (!passwordCheckResult.success || !passwordCheckResult.result) {
        logger.warn('Login failed: invalid password', { username });
        throw new AppError('Invalid credentials', 401);
    }
    
    // Handle 2FA verification
    if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
            return res.status(200).json({ 
                requires2FA: true,
                message: 'Por favor ingresa tu código de autenticación de dos factores'
            });
        }
        
        const twoFAResult = await authWorkerPool.executeTask({
            operation: 'verify2FA',
            data: { secret: user.twoFactorSecret, token: twoFactorCode }
        });
        
        if (!twoFAResult.success || !twoFAResult.result) {
            logger.warn('Login failed: invalid 2FA code', { username });
            throw new AppError('Código 2FA inválido', 401);
        }
    }
    
    // Generate JWT
    const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
        { expiresIn: '30d' }
    );
    
    // Audit log
    await AuditLog.create({
        action: 'LOGIN',
        userId: user._id.toString(),
        username: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { success: true, with2FA: user.twoFactorEnabled }
    });
    
    logger.info('Login successful', { username, role: user.role });
    
    res.json({ 
        token,
        user: {
            id: user._id,
            username: user.username,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled
        }
    });
});

// Setup 2FA
const setup2FA = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    
    const secret = speakeasy.generateSecret({ name: `ChatApp:${user.username}` });
    user.twoFactorSecret = secret.base32;
    await user.save();
    
    logger.info('2FA secret generated', { username: user.username });
    
    res.json({
        secret: secret.base32,
        qrCode: secret.otpauth_url
    });
});

// Enable 2FA
const enable2FA = asyncHandler(async (req, res) => {
    const { twoFactorCode } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
        throw new AppError('User not found', 404);
    }
    
    if (!user.twoFactorSecret) {
        throw new AppError('2FA not set up. Please scan the QR code first', 400);
    }
    
    const verificationResult = await authWorkerPool.executeTask({
        operation: 'verify2FA',
        data: { secret: user.twoFactorSecret, token: twoFactorCode }
    });
    
    if (!verificationResult.success || !verificationResult.result) {
        throw new AppError('Invalid 2FA code', 401);
    }
    
    user.twoFactorEnabled = true;
    await user.save();
    
    await AuditLog.create({
        action: 'ENABLE_2FA',
        userId: user._id.toString(),
        username: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { action: 'ENABLE_2FA' }
    });
    
    logger.info('2FA enabled', { username: user.username });
    res.json({ message: '2FA enabled successfully' });
});

// Disable 2FA
const disable2FA = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
        throw new AppError('User not found', 404);
    }
    
    const passwordCheckResult = await authWorkerPool.executeTask({
        operation: 'comparePassword',
        data: { password, hash: user.password }
    });
    
    if (!passwordCheckResult.success || !passwordCheckResult.result) {
        throw new AppError('Invalid password', 401);
    }
    
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();
    
    await AuditLog.create({
        action: 'DISABLE_2FA',
        userId: user._id.toString(),
        username: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { action: 'DISABLE_2FA' }
    });
    
    logger.info('2FA disabled', { username: user.username });
    res.json({ message: '2FA disabled successfully' });
});

// Verify token
const verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password -twoFactorSecret');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Asegurar que el campo twoFactorEnabled exista
        if (user.twoFactorEnabled === undefined || user.twoFactorEnabled === null) {
            user.twoFactorEnabled = false;
            await user.save();
        }
        
        console.log('✅ Admin verify endpoint - user data:', {
            username: user.username,
            twoFactorEnabled: user.twoFactorEnabled
        });
        
        res.json({ 
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({ error: 'Error verifying token' });
    }
};

module.exports = {
    registerAdmin,
    loginAdmin,
    setup2FA,
    enable2FA,
    disable2FA,
    verifyToken
};
