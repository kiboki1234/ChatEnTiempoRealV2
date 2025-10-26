const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { authenticateAdmin, requireAdmin } = require('../middlewares/authMiddleware');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Get all users (Admin only)
router.get(
    '/',
    authenticateAdmin,
    requireAdmin,
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
    ],
    validate,
    async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;
            const result = await UserService.getAllUsers(page, limit);
            res.json(result);
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).json({ error: 'Error al obtener usuarios' });
        }
    }
);

// Get user stats
router.get(
    '/:username/stats',
    [
        param('username').trim().isLength({ min: 3, max: 30 })
    ],
    validate,
    async (req, res) => {
        try {
            const { username } = req.params;
            const stats = await UserService.getUserStats(username);
            res.json(stats);
        } catch (error) {
            console.error('Error getting user stats:', error);
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    }
);

// Promote user to admin (Admin only)
router.post(
    '/:username/promote',
    authenticateAdmin,
    requireAdmin,
    [
        param('username').trim().isLength({ min: 3, max: 30 })
    ],
    validate,
    async (req, res) => {
        try {
            const { username } = req.params;
            const adminUsername = req.admin.username;
            
            const result = await UserService.promoteToAdmin(username, adminUsername);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error promoting user:', error);
            res.status(500).json({ error: 'Error al promover usuario' });
        }
    }
);

// Demote admin to user (Admin only)
router.post(
    '/:username/demote',
    authenticateAdmin,
    requireAdmin,
    [
        param('username').trim().isLength({ min: 3, max: 30 })
    ],
    validate,
    async (req, res) => {
        try {
            const { username } = req.params;
            const adminUsername = req.admin.username;
            
            const result = await UserService.demoteToUser(username, adminUsername);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error demoting user:', error);
            res.status(500).json({ error: 'Error al degradar usuario' });
        }
    }
);

// Check if user can create room
router.get(
    '/:username/can-create-room',
    [
        param('username').trim().isLength({ min: 3, max: 30 })
    ],
    validate,
    async (req, res) => {
        try {
            const { username } = req.params;
            const permission = await UserService.canUserCreateRoom(username);
            res.json(permission);
        } catch (error) {
            console.error('Error checking room creation permission:', error);
            res.status(500).json({ error: 'Error al verificar permisos' });
        }
    }
);

// Cleanup inactive rooms (Admin only)
router.post(
    '/cleanup',
    authenticateAdmin,
    requireAdmin,
    async (req, res) => {
        try {
            const result = await UserService.cleanupInactiveRooms();
            res.json(result);
        } catch (error) {
            console.error('Error cleaning up:', error);
            res.status(500).json({ error: 'Error en la limpieza' });
        }
    }
);

module.exports = router;
