const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateAdmin } = require('../middlewares/authMiddleware');
const { validateAdminRegistration, validateAdminLogin } = require('../middlewares/validationMiddleware');
const { authLimiter } = require('../middlewares/rateLimitMiddleware');

// Public routes
router.post('/register', authLimiter, validateAdminRegistration, authController.registerAdmin);
router.post('/login', authLimiter, validateAdminLogin, authController.loginAdmin);

// Protected routes (require authentication)
router.get('/verify', authenticateAdmin, authController.verifyToken);
router.post('/2fa/setup', authenticateAdmin, authController.setup2FA);
router.post('/2fa/enable', authenticateAdmin, authController.enable2FA);
router.post('/2fa/disable', authenticateAdmin, authController.disable2FA);

module.exports = router;
