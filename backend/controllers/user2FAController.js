const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const speakeasy = require('speakeasy');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../utils/errorHandler');

// Setup 2FA for regular users
const setup2FA = asyncHandler(async (req, res) => {
    logger.debug('Setup 2FA request', { userId: req.userId });
    
    const user = await User.findById(req.userId);
    if (!user) {
        logger.error('User not found during 2FA setup', { userId: req.userId });
        throw new AppError('User not found', 404);
    }
    
    logger.info('Generating 2FA secret', { username: user.username });
    
    const secret = speakeasy.generateSecret({
        name: `ChatApp:${user.username}`
    });
    
    user.twoFactorSecret = secret.base32;
    await user.save();
    
    logger.info('2FA secret saved', { username: user.username });
    
    res.json({
        secret: secret.base32,
        qrCode: secret.otpauth_url
    });
});

// Enable 2FA for regular users
const enable2FA = asyncHandler(async (req, res) => {
    const { twoFactorCode } = req.body;
    logger.debug('Enable 2FA request', { userId: req.userId, codeProvided: !!twoFactorCode });
    
    const user = await User.findById(req.userId);
    
    if (!user) {
        logger.error('User not found during 2FA enable', { userId: req.userId });
        throw new AppError('User not found', 404);
    }
    
    logger.debug('User found', { username: user.username, hasSecret: !!user.twoFactorSecret });
    
    if (!user.twoFactorSecret) {
        logger.warn('2FA not set up for user', { username: user.username });
        throw new AppError('2FA not set up. Please scan the QR code first.', 400);
    }
    
    logger.debug('Verifying 2FA code', { username: user.username });
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
    });
    
    if (!verified) {
        logger.warn('Invalid 2FA code', { username: user.username });
        throw new AppError('Invalid 2FA code', 401);
    }
    
    user.twoFactorEnabled = true;
    await user.save();
    
    // Create audit log
    await AuditLog.create({
        action: 'ENABLE_2FA',
        userId: user._id.toString(),
        username: user.username,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: { action: 'ENABLE_2FA', role: 'user' }
    });
    
    logger.info('2FA enabled successfully', { username: user.username });
    res.json({ message: '2FA enabled successfully' });
});

// Disable 2FA for regular users
const disable2FA = asyncHandler(async (req, res) => {
    const { password } = req.body;
    logger.debug('Disable 2FA request', { userId: req.userId });
    
    const user = await User.findById(req.userId);
    
    if (!user) {
        throw new AppError('User not found', 404);
    }
    
    // Si el usuario tiene contraseña, verificarla
    if (user.password) {
        if (!password) {
            throw new AppError('Password is required to disable 2FA', 400);
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            logger.warn('Invalid password during 2FA disable', { username: user.username });
            throw new AppError('Invalid password', 401);
        }
    } else {
        // Si no tiene contraseña (usuario creado sin registro)
        logger.info('Disabling 2FA for user without password', { username: user.username });
    }
    
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();
    
    // Create audit log
    await AuditLog.create({
        action: 'DISABLE_2FA',
        userId: user._id.toString(),
        username: user.username,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: { action: 'DISABLE_2FA', role: 'user', hadPassword: !!user.password }
    });
    
    logger.info('2FA disabled successfully', { username: user.username });
    res.json({ message: '2FA disabled successfully' });
});

// Get 2FA status
const get2FAStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select('twoFactorEnabled username role');
    if (!user) {
        throw new AppError('User not found', 404);
    }
    
    res.json({ 
        twoFactorEnabled: user.twoFactorEnabled || false,
        username: user.username,
        role: user.role
    });
});

module.exports = {
    setup2FA,
    enable2FA,
    disable2FA,
    get2FAStatus
};
