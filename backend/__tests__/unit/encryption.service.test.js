const encryptionService = require('../../services/encryptionService');

describe('Encryption Service', () => {
    describe('Room Keys', () => {
        it('should generate a room key', () => {
            const roomPin = '123456';
            const key = encryptionService.generateRoomKey(roomPin);

            expect(key).toBeDefined();
            expect(Buffer.isBuffer(key)).toBe(true);
            expect(key.length).toBeGreaterThan(0);
        });

        it('should retrieve existing room key', () => {
            const roomPin = '123456';
            const key1 = encryptionService.generateRoomKey(roomPin);
            const key2 = encryptionService.getRoomKey(roomPin);

            expect(key2).toBeDefined();
            expect(key1.equals(key2)).toBe(true);
        });

        it('should return undefined for non-existent room key', () => {
            const key = encryptionService.getRoomKey('non-existent-room');
            expect(key).toBeUndefined();
        });

        it('should clear room key', () => {
            const roomPin = '123456';
            encryptionService.generateRoomKey(roomPin);
            
            encryptionService.clearRoomKey(roomPin);
            const key = encryptionService.getRoomKey(roomPin);

            expect(key).toBeUndefined();
        });
    });

    describe('Message Encryption/Decryption', () => {
        it('should encrypt and decrypt message successfully', () => {
            const message = 'Hello, World!';
            const roomPin = '123456';
            const key = encryptionService.generateRoomKey(roomPin);

            const encrypted = encryptionService.encryptMessage(message, key);
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(message);

            const decrypted = encryptionService.decryptMessage(encrypted, key);
            expect(decrypted).toBe(message);
        });

        it('should handle empty message', () => {
            const message = '';
            const roomPin = '123456';
            const key = encryptionService.generateRoomKey(roomPin);

            const encrypted = encryptionService.encryptMessage(message, key);
            const decrypted = encryptionService.decryptMessage(encrypted, key);

            expect(decrypted).toBe(message);
        });

        it('should handle unicode characters', () => {
            const message = '¡Hola! 你好 🎉';
            const roomPin = '123456';
            const key = encryptionService.generateRoomKey(roomPin);

            const encrypted = encryptionService.encryptMessage(message, key);
            const decrypted = encryptionService.decryptMessage(encrypted, key);

            expect(decrypted).toBe(message);
        });

        it('should fail with wrong key', () => {
            const message = 'Secret message';
            const roomPin1 = '123456';
            const roomPin2 = '654321';
            const key1 = encryptionService.generateRoomKey(roomPin1);
            const key2 = encryptionService.generateRoomKey(roomPin2);

            const encrypted = encryptionService.encryptMessage(message, key1);

            expect(() => {
                encryptionService.decryptMessage(encrypted, key2);
            }).toThrow();
        });
    });

    describe('Hash Functions', () => {
        it('should hash data consistently', () => {
            const data = 'test-data';
            const hash1 = encryptionService.hashData(data);
            const hash2 = encryptionService.hashData(data);

            expect(hash1).toBe(hash2);
            expect(hash1.length).toBeGreaterThan(0);
        });

        it('should produce different hashes for different data', () => {
            const hash1 = encryptionService.hashData('data1');
            const hash2 = encryptionService.hashData('data2');

            expect(hash1).not.toBe(hash2);
        });
    });
});
