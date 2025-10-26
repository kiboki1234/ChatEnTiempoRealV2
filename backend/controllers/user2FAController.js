const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const speakeasy = require('speakeasy');

// Setup 2FA for regular users
const setup2FA = async (req, res) => {
    try {
        console.log('🔧 Setup 2FA (User) - userId:', req.userId);
        
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
        
        res.json({
            secret: secret.base32,
            qrCode: secret.otpauth_url
        });
    } catch (error) {
        console.error('❌ Error setting up 2FA:', error);
        res.status(500).json({ error: 'Error setting up 2FA' });
    }
};

// Enable 2FA for regular users
const enable2FA = async (req, res) => {
    try {
        const { twoFactorCode } = req.body;
        console.log('🔐 Enable 2FA (User) - userId:', req.userId);
        console.log('🔐 Code received:', twoFactorCode);
        
        const user = await User.findById(req.userId);
        
        if (!user) {
            console.error('❌ User not found:', req.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('✅ User found:', user.username);
        console.log('📱 Has secret:', !!user.twoFactorSecret);
        
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
            details: { action: 'ENABLE_2FA', role: 'user' }
        });
        
        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ error: 'Error enabling 2FA' });
    }
};

// Disable 2FA for regular users
const disable2FA = async (req, res) => {
    try {
        const { password } = req.body;
        console.log('🔓 Disable 2FA (User) - userId:', req.userId);
        
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Si el usuario tiene contraseña, verificarla
        if (user.password) {
            if (!password) {
                return res.status(400).json({ error: 'Password is required to disable 2FA' });
            }
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                console.log('❌ Invalid password');
                return res.status(401).json({ error: 'Invalid password' });
            }
        } else {
            // Si no tiene contraseña (usuario creado sin registro)
            console.log('⚠️ User has no password, disabling 2FA without password verification');
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
        
        console.log('✅ 2FA disabled successfully');
        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ error: 'Error disabling 2FA' });
    }
};

// Get 2FA status
const get2FAStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('twoFactorEnabled username role');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            twoFactorEnabled: user.twoFactorEnabled || false,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Error getting 2FA status:', error);
        res.status(500).json({ error: 'Error getting 2FA status' });
    }
};

module.exports = {
    setup2FA,
    enable2FA,
    disable2FA,
    get2FAStatus
};
