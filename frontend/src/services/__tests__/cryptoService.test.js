import { cryptoService } from '../cryptoService';

describe('Crypto Service', () => {
    describe('Message Encryption', () => {
        it('should encrypt and decrypt message', async () => {
            const message = 'Hello, World!';
            const key = 'test-encryption-key-32-characters';

            const encrypted = await cryptoService.encryptMessage(message, key);
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(message);

            const decrypted = await cryptoService.decryptMessage(encrypted, key);
            expect(decrypted).toBe(message);
        });

        it('should handle empty messages', async () => {
            const message = '';
            const key = 'test-encryption-key-32-characters';

            const encrypted = await cryptoService.encryptMessage(message, key);
            const decrypted = await cryptoService.decryptMessage(encrypted, key);

            expect(decrypted).toBe(message);
        });

        it('should handle unicode characters', async () => {
            const message = '¡Hola! 你好 🎉';
            const key = 'test-encryption-key-32-characters';

            const encrypted = await cryptoService.encryptMessage(message, key);
            const decrypted = await cryptoService.decryptMessage(encrypted, key);

            expect(decrypted).toBe(message);
        });

        it('should fail with wrong key', async () => {
            const message = 'Secret message';
            const key1 = 'test-encryption-key-32-characters';
            const key2 = 'different-key-32-characters!!!';

            const encrypted = await cryptoService.encryptMessage(message, key1);

            await expect(
                cryptoService.decryptMessage(encrypted, key2)
            ).rejects.toThrow();
        });
    });

    describe('Key Generation', () => {
        it('should generate key from string', () => {
            const keyString = 'test-key-material';
            const key = cryptoService.generateKey(keyString);

            expect(key).toBeDefined();
            expect(key.length).toBeGreaterThan(0);
        });

        it('should generate same key for same input', () => {
            const keyString = 'test-key-material';
            const key1 = cryptoService.generateKey(keyString);
            const key2 = cryptoService.generateKey(keyString);

            expect(key1).toEqual(key2);
        });

        it('should generate different keys for different inputs', () => {
            const key1 = cryptoService.generateKey('input1');
            const key2 = cryptoService.generateKey('input2');

            expect(key1).not.toEqual(key2);
        });
    });

    describe('Hash Functions', () => {
        it('should hash data consistently', () => {
            const data = 'test-data';
            const hash1 = cryptoService.hash(data);
            const hash2 = cryptoService.hash(data);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different data', () => {
            const hash1 = cryptoService.hash('data1');
            const hash2 = cryptoService.hash('data2');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('Random Generation', () => {
        it('should generate random bytes', () => {
            const bytes = cryptoService.randomBytes(16);

            expect(bytes).toBeDefined();
            expect(bytes.length).toBe(16);
        });

        it('should generate different random values', () => {
            const bytes1 = cryptoService.randomBytes(16);
            const bytes2 = cryptoService.randomBytes(16);

            expect(bytes1).not.toEqual(bytes2);
        });
    });
});
