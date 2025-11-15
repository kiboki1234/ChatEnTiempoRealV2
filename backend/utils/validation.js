/**
 * Utilidades de validación centralizadas
 */
const { body, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map(err => err.msg).join(', ');
        return next(new AppError(messages, 400));
    }
    next();
};

const authValidation = {
    register: [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers and underscores'),
        body('email')
            .trim()
            .isEmail()
            .withMessage('Invalid email address')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        validateRequest
    ],
    login: [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
        validateRequest
    ]
};

const roomValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('Room name must be between 3 and 50 characters'),
        body('maxParticipants')
            .optional()
            .isInt({ min: 2, max: 100 })
            .withMessage('Max participants must be between 2 and 100'),
        body('type')
            .isIn(['text', 'multimedia'])
            .withMessage('Room type must be either text or multimedia'),
        validateRequest
    ]
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

module.exports = {
    validateRequest,
    authValidation,
    roomValidation,
    sanitizeInput
};
