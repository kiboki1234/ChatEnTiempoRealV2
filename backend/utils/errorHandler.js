/**
 * Manejador centralizado de errores
 */
const logger = require('./logger');

class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production' && !err.isOperational) {
        return res.status(err.statusCode).json({
            error: 'Internal server error',
            message: 'Something went wrong'
        });
    }

    res.status(err.statusCode).json({
        error: err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};
