const { body, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation rules for admin registration
const validateAdminRegistration = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .escape(),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Must be a valid email')
        .normalizeEmail()
        .escape(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    validate
];

// Validation rules for admin login
const validateAdminLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .escape(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    body('twoFactorCode')
        .optional()
        .isLength({ min: 6, max: 6 })
        .withMessage('2FA code must be 6 digits')
        .isNumeric()
        .withMessage('2FA code must be numeric'),
    validate
];

// Validation rules for room creation
const validateRoomCreation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Room name must be between 1 and 100 characters')
        .escape(),
    body('type')
        .isIn(['text', 'multimedia'])
        .withMessage('Room type must be either "text" or "multimedia"'),
    body('maxParticipants')
        .isInt({ min: 2, max: 1000 })
        .withMessage('Max participants must be between 2 and 1000'),
    body('expiresIn')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Expiration time must be a positive number'),
    validate
];

// Validation rules for message
const validateMessage = [
    body('username')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Username must be between 1 and 50 characters')
        .escape(),
    body('message')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Message must not exceed 5000 characters')
        .escape(),
    body('roomPin')
        .optional()
        .trim()
        .matches(/^[0-9]{6}$/)
        .withMessage('Room PIN must be 6 digits'),
    validate
];

// Validation rules for room PIN
const validateRoomPin = [
    body('pin')
        .trim()
        .matches(/^[0-9]{4,6}$/)
        .withMessage('PIN must be 4 to 6 digits'),
    validate
];

// Sanitize HTML to prevent XSS
const sanitizeHtml = (text) => {
    if (!text) return text;
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

module.exports = {
    validate,
    validateAdminRegistration,
    validateAdminLogin,
    validateRoomCreation,
    validateMessage,
    validateRoomPin,
    sanitizeHtml
};
