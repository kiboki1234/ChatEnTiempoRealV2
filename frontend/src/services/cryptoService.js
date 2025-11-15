import sodium from 'libsodium-wrappers';

class CryptoService {
  constructor() {
    this.initialized = false;
    this.roomKeys = new Map(); // Claves simétricas por sala
  }

  async initialize() {
    if (this.initialized) return;
    await sodium.ready;
    this.initialized = true;
  }

  // Generar una clave simétrica para la sala (32 bytes)
  generateRoomKey() {
    return sodium.randombytes_buf(32);
  }

  // Establecer la clave de una sala
  setRoomKey(roomPin, key) {
    if (typeof key === 'string') {
      // Si es hex string, convertir a Uint8Array
      key = sodium.from_hex(key);
    }
    this.roomKeys.set(roomPin, key);
  }

  // Obtener la clave de una sala
  getRoomKey(roomPin) {
    return this.roomKeys.get(roomPin);
  }

  // Limpiar la clave de una sala
  clearRoomKey(roomPin) {
    this.roomKeys.delete(roomPin);
  }

  // Cifrar un mensaje para una sala (cifrado simétrico)
  async encryptMessage(message, roomPin) {
    await this.initialize();
    
    const key = this.getRoomKey(roomPin);
    if (!key) {
      throw new Error(`No hay clave de cifrado para la sala ${roomPin}`);
    }

    // Generar nonce aleatorio
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    
    // Cifrar con secretbox (cifrado simétrico autenticado)
    const ciphertext = sodium.crypto_secretbox_easy(
      sodium.from_string(message),
      nonce,
      key
    );

    return {
      ciphertext: sodium.to_hex(ciphertext),
      nonce: sodium.to_hex(nonce)
    };
  }

  // Descifrar un mensaje de una sala
  async decryptMessage(encryptedData, roomPin) {
    await this.initialize();
    
    const key = this.getRoomKey(roomPin);
    if (!key) {
      throw new Error(`No hay clave de cifrado para la sala ${roomPin}`);
    }

    try {
      const plaintext = sodium.crypto_secretbox_open_easy(
        sodium.from_hex(encryptedData.ciphertext),
        sodium.from_hex(encryptedData.nonce),
        key
      );

      return sodium.to_string(plaintext);
    } catch (error) {
      console.error('Error descifrando mensaje:', error);
      throw new Error('No se pudo descifrar el mensaje');
    }
  }

  // Exportar clave de sala como hex (para compartir)
  exportRoomKey(roomPin) {
    const key = this.getRoomKey(roomPin);
    if (!key) return null;
    return sodium.to_hex(key);
  }
}

export const cryptoService = new CryptoService();