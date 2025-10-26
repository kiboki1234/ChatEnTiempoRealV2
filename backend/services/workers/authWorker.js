const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

/**
 * Authentication Worker
 * Handles CPU-intensive authentication operations in parallel
 */

// Hash password
async function hashPassword(password) {
    // Load bcryptjs only when needed (lazy loading in worker)
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Compare password
async function comparePassword(password, hash) {
    // Load bcryptjs only when needed (lazy loading in worker)
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
}

// Verify 2FA code
function verify2FACode(secret, token) {
    // Load speakeasy only when needed (lazy loading in worker)
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
    });
}

// Generate device fingerprint
function generateDeviceFingerprint(data) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex')
        .substring(0, 32);
}

// Generate secure token
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Main worker execution
(async () => {
    try {
        const { operation, data } = workerData;
        
        let result;
        
        switch (operation) {
            case 'hashPassword':
                result = await hashPassword(data.password);
                break;
                
            case 'comparePassword':
                result = await comparePassword(data.password, data.hash);
                break;
                
            case 'verify2FA':
                result = verify2FACode(data.secret, data.token);
                break;
                
            case 'generateFingerprint':
                result = generateDeviceFingerprint(data);
                break;
                
            case 'generateToken':
                result = generateSecureToken(data.length);
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
