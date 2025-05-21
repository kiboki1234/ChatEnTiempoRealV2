import sodium from 'libsodium-wrappers';

class CryptoService {
  constructor() {
    this.keyPair = null;
    this.otherPublicKeys = new Map(); // Para almacenar claves públicas de otros usuarios
  }

  async initialize() {
    await sodium.ready;
    this.keyPair = sodium.crypto_box_keypair();
  }

  getPublicKey() {
    if (!this.keyPair) throw new Error('CryptoService no inicializado');
    return sodium.to_hex(this.keyPair.publicKey);
  }

  // Almacenar la clave pública de otro usuario
  addOtherUserPublicKey(userId, publicKeyHex) {
    const publicKey = sodium.from_hex(publicKeyHex);
    this.otherPublicKeys.set(userId, publicKey);
  }

  // Cifrar un mensaje para un usuario específico
  async encryptMessage(message, recipientId) {
    await sodium.ready;
    const publicKey = this.otherPublicKeys.get(recipientId);
    if (!publicKey) {
      throw new Error('Clave pública del destinatario no encontrada');
    }

    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const ciphertext = sodium.crypto_box_easy(
      message,
      nonce,
      publicKey,
      this.keyPair.privateKey
    );

    return {
      ciphertext: sodium.to_hex(ciphertext),
      nonce: sodium.to_hex(nonce)
    };
  }

  // Descifrar un mensaje
  async decryptMessage(encryptedData, senderId) {
    await sodium.ready;
    const publicKey = this.otherPublicKeys.get(senderId);
    if (!publicKey) {
      throw new Error('Clave pública del remitente no encontrada');
    }

    const message = sodium.crypto_box_open_easy(
      sodium.from_hex(encryptedData.ciphertext),
      sodium.from_hex(encryptedData.nonce),
      publicKey,
      this.keyPair.privateKey
    );

    return sodium.to_string(message);
  }
}

export const cryptoService = new CryptoService();