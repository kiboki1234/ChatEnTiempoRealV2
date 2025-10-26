const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function encryptData(data, key) {
    try {
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            success: true,
            result: {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function decryptData(encryptedData, key) {
    try {
        const keyBuffer = Buffer.from(key, 'hex');
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            keyBuffer,
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return {
            success: true,
            result: decrypted
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function generateHash(data) {
    try {
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        return {
            success: true,
            result: hash
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
    const { operation, data, key, encryptedData } = workerData;
    
    let result;
    switch (operation) {
        case 'encrypt':
            result = encryptData(data, key);
            break;
        case 'decrypt':
            result = decryptData(encryptedData, key);
            break;
        case 'hash':
            result = generateHash(data);
            break;
        default:
            result = {
                success: false,
                error: 'Unknown operation'
            };
    }
    
    parentPort.postMessage(result);
} catch (error) {
    parentPort.postMessage({
        success: false,
        error: error.message
    });
}
