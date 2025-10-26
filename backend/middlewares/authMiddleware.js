const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token for any authenticated user
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
        );
        
        const user = await User.findById(decoded.userId).select('-password -twoFactorSecret');
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token or user not found' });
        }
        
        req.userId = decoded.userId;
        req.username = decoded.username;
        req.userRole = user.role;
        req.user = user;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Legacy middleware - mantener compatibilidad con código antiguo
const authenticateAdmin = authenticateUser;

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = {
    authenticateUser,
    authenticateAdmin,
    requireAdmin
};
