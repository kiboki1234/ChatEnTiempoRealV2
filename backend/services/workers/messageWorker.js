const { parentPort, workerData } = require('worker_threads');

function sanitizeMessage(message) {
    if (!message) return '';
    
    return message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function validateMessage(message, maxLength = 5000) {
    const errors = [];
    
    if (!message || message.trim().length === 0) {
        errors.push('Message cannot be empty');
    }
    
    if (message.length > maxLength) {
        errors.push(`Message exceeds maximum length of ${maxLength} characters`);
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onclick=/i,
        /onload=/i,
        /<iframe/i,
        /<embed/i,
        /<object/i
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(message)) {
            errors.push('Message contains potentially malicious content');
            break;
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

function processMessage(message, options = {}) {
    try {
        const validation = validateMessage(message, options.maxLength);
        
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors
            };
        }
        
        const sanitized = sanitizeMessage(message);
        
        // Extract URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = message.match(urlRegex) || [];
        
        // Extract mentions (if any)
        const mentionRegex = /@(\w+)/g;
        const mentions = message.match(mentionRegex) || [];
        
        return {
            success: true,
            result: {
                original: message,
                sanitized,
                urls,
                mentions: mentions.map(m => m.substring(1)),
                length: message.length,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Main worker execution
try {
    const { message, options } = workerData;
    const result = processMessage(message, options);
    parentPort.postMessage(result);
} catch (error) {
    parentPort.postMessage({
        success: false,
        error: error.message
    });
}
