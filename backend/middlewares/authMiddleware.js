const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to verify JWT token
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
        );
        
        const admin = await Admin.findById(decoded.adminId).select('-password -twoFactorSecret');
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ error: 'Invalid token or inactive admin' });
        }
        
        req.adminId = decoded.adminId;
        req.username = decoded.username;
        req.isAdmin = decoded.isAdmin;
        req.admin = admin;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = {
    authenticateAdmin,
    requireAdmin
};
