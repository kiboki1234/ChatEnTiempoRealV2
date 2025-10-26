const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

/**
 * Room Worker
 * Handles room-related operations in parallel
 */

// Generate a random 6-digit PIN
function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate room ID
function generateRoomId() {
    return crypto.randomBytes(16).toString('hex');
}

// Hash PIN for storage
async function hashPin(pin) {
    // Load bcryptjs only when needed (lazy loading in worker)
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    return await bcrypt.hash(pin, saltRounds);
}

// Validate room name
function validateRoomName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Room name is required' };
    }
    
    if (name.length < 3) {
        return { valid: false, error: 'Room name must be at least 3 characters' };
    }
    
    if (name.length > 50) {
        return { valid: false, error: 'Room name must be less than 50 characters' };
    }
    
    // Check for malicious patterns
    const maliciousPatterns = [
        /<script/gi,
        /javascript:/gi,
        /on\w+=/gi,
        /<iframe/gi
    ];
    
    for (const pattern of maliciousPatterns) {
        if (pattern.test(name)) {
            return { valid: false, error: 'Room name contains invalid characters' };
        }
    }
    
    return { valid: true };
}

// Calculate room expiration
function calculateExpiration(hoursFromNow) {
    if (!hoursFromNow || hoursFromNow <= 0) {
        return null;
    }
    
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + hoursFromNow);
    return expirationDate;
}

// Generate room encryption key
function generateRoomKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Validate participant data
function validateParticipant(username, ipAddress) {
    const errors = [];
    
    if (!username || typeof username !== 'string') {
        errors.push('Username is required');
    } else {
        if (username.length < 2) {
            errors.push('Username must be at least 2 characters');
        }
        if (username.length > 30) {
            errors.push('Username must be less than 30 characters');
        }
    }
    
    if (!ipAddress) {
        errors.push('IP address is required');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Main worker execution
(async () => {
    try {
        const { operation, data } = workerData;
        
        let result;
        
        switch (operation) {
            case 'generatePin':
                result = generatePin();
                break;
                
            case 'generateRoomId':
                result = generateRoomId();
                break;
                
            case 'hashPin':
                result = await hashPin(data.pin);
                break;
                
            case 'validateRoomName':
                result = validateRoomName(data.name);
                break;
                
            case 'calculateExpiration':
                result = calculateExpiration(data.hours);
                break;
                
            case 'generateRoomKey':
                result = generateRoomKey();
                break;
                
            case 'validateParticipant':
                result = validateParticipant(data.username, data.ipAddress);
                break;
                
            case 'generateRoomData':
                // Combined operation for room creation
                const pin = generatePin();
                const roomId = generateRoomId();
                const encryptionKey = generateRoomKey();
                const nameValidation = validateRoomName(data.name);
                
                if (!nameValidation.valid) {
                    throw new Error(nameValidation.error);
                }
                
                result = {
                    pin,
                    roomId,
                    encryptionKey,
                    expiresAt: calculateExpiration(data.expiresIn)
                };
                break;
                
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        
        parentPort.postMessage({
            success: true,
            result
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
})();
