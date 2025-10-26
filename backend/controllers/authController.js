const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');

// Register a new admin (should be restricted in production)
const registerAdmin = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const user = new User({
            username,
            password,
            email,
            role: 'admin' // Crear como admin
        });
        
        await user.save();
        
        // Create audit log
        await AuditLog.create({
            action: 'ADMIN_ACTION',
            userId: user._id.toString(),
            username: user.username,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { action: 'REGISTER' }
        });
        
        res.status(201).json({ 
            message: 'Admin registered successfully',
            userId: user._id 
        });
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ error: 'Error registering admin' });
    }
};

// Login
const loginAdmin = async (req, res) => {
    try {
        const { username, password, twoFactorCode } = req.body;
        
        console.log('🔐 Login attempt:', { username, has2FACode: !!twoFactorCode });
        
        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ User found:', { username, has2FA: user.twoFactorEnabled });
        
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ Password valid');
        
        // Check 2FA if enabled
        if (user.twoFactorEnabled) {
            console.log('🔐 2FA is enabled for this user');
            if (!twoFactorCode) {
                console.log('⚠️ 2FA code not provided, requesting it...');
                // Usuario tiene 2FA activo pero no envió el código
                // Retornar 200 con requires2FA para que el frontend muestre el campo
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
        
        // Generate JWT
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
            { expiresIn: '30d' }
        );
        
        // Create audit log
        await AuditLog.create({
            action: 'LOGIN',
            userId: user._id.toString(),
            username: user.username,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { success: true, with2FA: user.twoFactorEnabled }
        });
        
        res.json({ 
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

// Setup 2FA
const setup2FA = async (req, res) => {
    try {
        console.log('🔧 Setup 2FA - userId:', req.userId);
        
        const user = await User.findById(req.userId);
        if (!user) {
            console.error('❌ User not found:', req.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('✅ User found:', user.username);
        
        const secret = speakeasy.generateSecret({
            name: `ChatApp:${user.username}`
        });
        
        user.twoFactorSecret = secret.base32;
        await user.save();
        
        console.log('✅ Secret saved for user:', user.username);
        console.log('📱 Secret:', secret.base32);
        
        res.json({
            secret: secret.base32,
            qrCode: secret.otpauth_url
        });
    } catch (error) {
        console.error('❌ Error setting up 2FA:', error);
        res.status(500).json({ error: 'Error setting up 2FA' });
    }
};

// Enable 2FA
const enable2FA = async (req, res) => {
    try {
        const { twoFactorCode } = req.body;
        console.log('🔐 Enable 2FA - userId:', req.userId);
        console.log('🔐 Code received:', twoFactorCode);
        
        const user = await User.findById(req.userId);
        
        if (!user) {
            console.error('❌ User not found:', req.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('✅ User found:', user.username);
        console.log('📱 Has secret:', !!user.twoFactorSecret);
        console.log('📱 Secret value:', user.twoFactorSecret ? user.twoFactorSecret.substring(0, 8) + '...' : 'null');
        
        if (!user.twoFactorSecret) {
            console.error('❌ 2FA not set up for user:', user.username);
            return res.status(400).json({ error: '2FA not set up. Please scan the QR code first.' });
        }
        
        console.log('🔍 Verifying code...');
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorCode,
            window: 2
        });
        
        console.log('✅ Verification result:', verified);
        
        if (!verified) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
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
            details: { action: 'ENABLE_2FA' }
        });
        
        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ error: 'Error enabling 2FA' });
    }
};

// Disable 2FA
const disable2FA = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
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
            details: { action: 'DISABLE_2FA' }
        });
        
        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ error: 'Error disabling 2FA' });
    }
};

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
