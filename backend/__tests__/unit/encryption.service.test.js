const encryptionService = require('../../services/encryptionService');

describe('Encryption Service', () => {
    describe('Room Keys', () => {
        it('should generate a room key', () => {
            const roomPin = '123456';
            const key = encryptionService.generateRoomKey(roomPin);

            expect(key).toBeDefined();
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(0);
        });

        it('should retrieve existing room key', () => {
            const roomPin = '123457';
            const keyHex = encryptionService.generateRoomKey(roomPin);
            const keyBuffer = encryptionService.getRoomKey(roomPin);

            expect(keyBuffer).toBeDefined();
            expect(Buffer.from(keyHex, 'hex').equals(keyBuffer)).toBe(true);
        });

        it('should return undefined for non-existent room key', () => {
            const key = encryptionService.getRoomKey('non-existent-room');
            expect(key).toBeUndefined();
        });

        it('should clear room key', () => {
            const roomPin = '123458';
            encryptionService.generateRoomKey(roomPin);
            
            encryptionService.clearRoomKey(roomPin);
            const key = encryptionService.getRoomKey(roomPin);

            expect(key).toBeUndefined();
        });
    });

    describe('Message Encryption/Decryption', () => {
        it('should encrypt and decrypt message successfully', () => {
            const message = 'Hello, World!';
            const roomPin = '123459';
            
            // generateRoomKey now returns hex string, but internal map stores Buffer
            encryptionService.generateRoomKey(roomPin);

            const encrypted = encryptionService.encryptMessage(message, roomPin);
            expect(encrypted).toBeDefined();
            expect(encrypted.encrypted).not.toBe(message);

            const decrypted = encryptionService.decryptMessage(encrypted, roomPin);
            expect(decrypted).toBe(message);
        });

        it('should handle empty message', () => {
            const message = '';
            const roomPin = '123460';
            
            encryptionService.generateRoomKey(roomPin);

            const encrypted = encryptionService.encryptMessage(message, roomPin);
            const decrypted = encryptionService.decryptMessage(encrypted, roomPin);

            expect(decrypted).toBe(message);
        });

        it('should handle unicode characters', () => {
            const message = '¡Hola! 你好 🎉';
            const roomPin = '123461';
            
            encryptionService.generateRoomKey(roomPin);

            const encrypted = encryptionService.encryptMessage(message, roomPin);
            const decrypted = encryptionService.decryptMessage(encrypted, roomPin);

            expect(decrypted).toBe(message);
        });

        it('should fail with wrong key', () => {
            const message = 'Secret message';
            const roomPin1 = '123462';
            const roomPin2 = '654322';
            
            encryptionService.generateRoomKey(roomPin1);
            encryptionService.generateRoomKey(roomPin2);

            const encrypted = encryptionService.encryptMessage(message, roomPin1);

            expect(() => {
                encryptionService.decryptMessage(encrypted, roomPin2);
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
