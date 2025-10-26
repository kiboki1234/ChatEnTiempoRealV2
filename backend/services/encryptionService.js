const crypto = require('crypto');
const sodium = require('libsodium-wrappers');

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.roomKeys = new Map(); // Store ephemeral keys for each room
    }

    async initialize() {
        await sodium.ready;
    }

    // Generate ephemeral key for a room
    generateRoomKey(roomPin) {
        const key = crypto.randomBytes(32);
        this.roomKeys.set(roomPin, key);
        return key.toString('hex');
    }

    // Get room key
    getRoomKey(roomPin) {
        return this.roomKeys.get(roomPin);
    }

    // Set room key (for external key generation)
    setRoomKey(roomPin, key) {
        this.roomKeys.set(roomPin, key);
        return key;
    }

    // Encrypt message using AES-256-GCM
    encryptMessage(message, roomPin) {
        try {
            let key = this.getRoomKey(roomPin);
            
            // If no room key exists, generate one
            if (!key) {
                key = Buffer.from(this.generateRoomKey(roomPin), 'hex');
            }
            
            // Generate random IV
            const iv = crypto.randomBytes(12);
            
            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            // Encrypt
            let encrypted = cipher.update(message, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Get auth tag
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            console.error('Error encrypting message:', error);
            throw error;
        }
    }

    // Decrypt message using AES-256-GCM
    decryptMessage(encryptedData, roomPin) {
        try {
            const key = this.getRoomKey(roomPin);
            
            if (!key) {
                throw new Error('Room key not found');
            }
            
            // Create decipher
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                key,
                Buffer.from(encryptedData.iv, 'hex')
            );
            
            // Set auth tag
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            // Decrypt
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw error;
        }
    }

    // Hash data using SHA-256
    hashData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Generate HMAC signature
    generateSignature(data, secret) {
        return crypto
            .createHmac('sha256', secret || process.env.SIGNATURE_SECRET || 'default-secret')
            .update(data)
            .digest('hex');
    }

    // Verify HMAC signature
    verifySignature(data, signature, secret) {
        const expectedSignature = this.generateSignature(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    // Generate random token
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Encrypt file data
    async encryptFile(fileBuffer, roomPin) {
        try {
            let key = this.getRoomKey(roomPin);
            
            if (!key) {
                key = Buffer.from(this.generateRoomKey(roomPin), 'hex');
            }
            
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            const encrypted = Buffer.concat([
                cipher.update(fileBuffer),
                cipher.final()
            ]);
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            console.error('Error encrypting file:', error);
            throw error;
        }
    }

    // Decrypt file data
    async decryptFile(encryptedData, roomPin) {
        try {
            const key = this.getRoomKey(roomPin);
            
            if (!key) {
                throw new Error('Room key not found');
            }
            
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                key,
                Buffer.from(encryptedData.iv, 'hex')
            );
            
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            const decrypted = Buffer.concat([
                decipher.update(encryptedData.encrypted),
                decipher.final()
            ]);
            
            return decrypted;
        } catch (error) {
            console.error('Error decrypting file:', error);
            throw error;
        }
    }

    // Clear room key (call when room is deleted or expires)
    clearRoomKey(roomPin) {
        this.roomKeys.delete(roomPin);
    }

    // Encrypt data at rest (for database storage)
    encryptAtRest(data) {
        const key = Buffer.from(
            process.env.DATA_ENCRYPTION_KEY || 'default-32-char-encryption-key!',
            'utf8'
        ).slice(0, 32);
        
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    // Decrypt data at rest
    decryptAtRest(encryptedData) {
        const key = Buffer.from(
            process.env.DATA_ENCRYPTION_KEY || 'default-32-char-encryption-key!',
            'utf8'
        ).slice(0, 32);
        
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            key,
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
}

module.exports = new EncryptionService();
