const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');

// Register a new admin (should be restricted in production)
const registerAdmin = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin already exists' });
        }
        
        const admin = new Admin({
            username,
            password,
            email
        });
        
        await admin.save();
        
        // Create audit log
        await AuditLog.create({
            action: 'ADMIN_ACTION',
            userId: admin._id.toString(),
            username: admin.username,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { action: 'REGISTER' }
        });
        
        res.status(201).json({ 
            message: 'Admin registered successfully',
            adminId: admin._id 
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
        
        // Find admin
        const admin = await Admin.findOne({ username, isActive: true });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check 2FA if enabled
        if (admin.twoFactorEnabled) {
            if (!twoFactorCode) {
                return res.status(401).json({ 
                    error: '2FA code required',
                    requires2FA: true 
                });
            }
            
            const verified = speakeasy.totp.verify({
                secret: admin.twoFactorSecret,
                encoding: 'base32',
                token: twoFactorCode,
                window: 2
            });
            
            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA code' });
            }
        }
        
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        
        // Generate JWT
        const token = jwt.sign(
            { 
                adminId: admin._id, 
                username: admin.username,
                isAdmin: true
            },
            process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
            { expiresIn: '8h' }
        );
        
        // Create audit log
        await AuditLog.create({
            action: 'LOGIN',
            userId: admin._id.toString(),
            username: admin.username,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { success: true, with2FA: admin.twoFactorEnabled }
        });
        
        res.json({ 
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                twoFactorEnabled: admin.twoFactorEnabled
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
        const admin = await Admin.findById(req.adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        const secret = speakeasy.generateSecret({
            name: `ChatApp:${admin.username}`
        });
        
        admin.twoFactorSecret = secret.base32;
        await admin.save();
        
        res.json({
            secret: secret.base32,
            qrCode: secret.otpauth_url
        });
    } catch (error) {
        console.error('Error setting up 2FA:', error);
        res.status(500).json({ error: 'Error setting up 2FA' });
    }
};

// Enable 2FA
const enable2FA = async (req, res) => {
    try {
        const { twoFactorCode } = req.body;
        const admin = await Admin.findById(req.adminId);
        
        if (!admin || !admin.twoFactorSecret) {
            return res.status(400).json({ error: '2FA not set up' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: admin.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorCode,
            window: 2
        });
        
        if (!verified) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }
        
        admin.twoFactorEnabled = true;
        await admin.save();
        
        // Create audit log
        await AuditLog.create({
            action: 'ADMIN_ACTION',
            userId: admin._id.toString(),
            username: admin.username,
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
        const admin = await Admin.findById(req.adminId);
        
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        admin.twoFactorEnabled = false;
        admin.twoFactorSecret = null;
        await admin.save();
        
        // Create audit log
        await AuditLog.create({
            action: 'ADMIN_ACTION',
            userId: admin._id.toString(),
            username: admin.username,
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
        const admin = await Admin.findById(req.adminId).select('-password -twoFactorSecret');
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.json({ admin });
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
