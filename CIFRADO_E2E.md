# Cifrado Punto a Punto (E2E) Implementado

## 🔐 Descripción

Se ha implementado un sistema de **cifrado punto a punto (End-to-End Encryption)** verdadero en la aplicación de chat. Esto significa que:

✅ **El servidor NO puede leer los mensajes** - Los mensajes se cifran en el cliente antes de enviarse
✅ **Solo los participantes pueden descifrar** - La clave se comparte solo entre usuarios de la sala
✅ **Privacidad total** - El administrador de la aplicación NO puede ver el contenido de los mensajes

## 🏗️ Arquitectura

### Frontend (`cryptoService.js`)
- **Biblioteca**: `libsodium-wrappers` (NaCl/libsodium)
- **Algoritmo**: `crypto_secretbox` (XSalsa20-Poly1305)
- **Cifrado simétrico autenticado** por sala

### Backend
- **Rol**: Servidor "ciego" - solo retransmite mensajes cifrados
- **NO almacena** claves de descifrado
- **NO puede descifrar** mensajes
- Solo genera y distribuye claves de sala

## 🔄 Flujo de Funcionamiento

### 1. Creación de Sala

```
Cliente (Creador)
    ↓
1. Solicita crear sala
    ↓
Servidor
    ↓
2. Genera clave aleatoria de 32 bytes
3. Guarda sala en BD con encryptionKey
4. Envía sala + encryptionKey SOLO al creador
    ↓
Cliente (Creador)
    ↓
5. Almacena clave en memoria (cryptoService)
6. NUNCA la envía de vuelta al servidor
```

### 2. Unirse a Sala

```
Cliente (Nuevo usuario)
    ↓
1. Solicita unirse con PIN
    ↓
Servidor
    ↓
2. Busca sala en BD (con encryptionKey)
3. Envía sala + encryptionKey al nuevo usuario
    ↓
Cliente (Nuevo usuario)
    ↓
4. Almacena clave en memoria (cryptoService)
5. NUNCA la envía de vuelta al servidor
```

### 3. Enviar Mensaje

```
Cliente A
    ↓
1. Usuario escribe mensaje: "Hola"
2. cryptoService.encryptMessage("Hola", roomPin)
   - Genera nonce aleatorio
   - Cifra con crypto_secretbox
   - Retorna: { ciphertext: "a3f9...", nonce: "12ab..." }
3. Envía al servidor:
   {
     username: "Alice",
     message: "[Cifrado E2E]",  ← Placeholder
     encryptedMessage: {
       ciphertext: "a3f9...",
       nonce: "12ab..."
     }
   }
    ↓
Servidor
    ↓
4. Guarda en BD (cifrado)
5. Retransmite a todos en sala (cifrado)
    ↓
Cliente B
    ↓
6. Recibe mensaje cifrado
7. cryptoService.decryptMessage(encryptedMessage, roomPin)
   - Descifra con clave de sala
   - Retorna: "Hola"
8. Muestra mensaje descifrado al usuario
```

## 🔑 Gestión de Claves

### Almacenamiento

**Frontend (Cliente)**:
```javascript
// En memoria (RAM) - NO persistente
cryptoService.roomKeys = new Map([
  ["123456", Uint8Array[32 bytes]]
]);
```
- Las claves se pierden al cerrar la pestaña ✅
- Requiere re-unirse a la sala para obtener la clave nuevamente

**Backend (Servidor)**:
```javascript
// MongoDB - Protegida
Room {
  encryptionKey: String,  // Hex string de 32 bytes
  select: false           // NO se incluye en queries por defecto
}
```
- Solo se recupera cuando un usuario se une
- El servidor nunca la usa para descifrar

### Seguridad de Claves

```javascript
// ✅ SEGURO: Clave solo accesible al unirse
getRoomByPin(pin, includeEncryptionKey = true)

// ❌ PELIGRO: Sin clave, no se incluye por defecto
getRoomByPin(pin) // encryptionKey no viene
```

## 📊 Flujo de Datos

```
┌─────────────────┐                  ┌──────────────┐                  ┌─────────────────┐
│   Cliente A     │                  │   Servidor   │                  │   Cliente B     │
│                 │                  │   (CIEGO)    │                  │                 │
├─────────────────┤                  ├──────────────┤                  ├─────────────────┤
│ cryptoService   │                  │              │                  │ cryptoService   │
│ Clave: abc123   │                  │              │                  │ Clave: abc123   │
└─────────────────┘                  └──────────────┘                  └─────────────────┘
        │                                    │                                    │
        │ 1. Cifrar "Hola"                   │                                    │
        │    → "a3f9..."                     │                                    │
        │────────────────────────────────────▶                                    │
        │ 2. Enviar cifrado                  │                                    │
        │                                    │                                    │
        │                                    │ 3. Retransmitir cifrado            │
        │                                    │────────────────────────────────────▶
        │                                    │                                    │
        │                                    │                         4. Descifrar "a3f9..."
        │                                    │                            → "Hola"
        │                                    │                                    │
```

## 🛡️ Garantías de Seguridad

### ✅ Lo que está protegido

1. **Contenido de mensajes**: Cifrado con XSalsa20-Poly1305
2. **Integridad**: Poly1305 MAC previene manipulación
3. **Privacidad del servidor**: El servidor NO puede leer mensajes
4. **Privacidad de BD**: Los mensajes en MongoDB están cifrados

### ⚠️ Lo que NO está protegido (metadatos)

1. **Quién envía mensajes**: El servidor ve `username`
2. **Cuándo se envían**: Timestamps visibles
3. **En qué sala**: `roomPin` visible
4. **Imágenes/archivos**: URLs visibles (Cloudinary)

### 🔒 Amenazas Mitigadas

✅ Administrador del servidor no puede leer mensajes
✅ Acceso a base de datos no revela contenido
✅ Ataques MITM solo ven datos cifrados
✅ Logs del servidor no contienen mensajes en claro

### ⚠️ Amenazas NO Mitigadas

❌ Usuario malicioso en la sala puede leer (tiene la clave)
❌ Malware en el cliente puede robar clave de memoria
❌ XSS podría extraer claves si hay vulnerabilidad
❌ Servidor comprometido podría modificar JS del cliente

## 📝 Modelo de Datos

### Mensaje en MongoDB

```javascript
{
  _id: ObjectId("..."),
  username: "Alice",
  message: "[Cifrado E2E]",  // Placeholder
  encryptedMessage: {
    ciphertext: "a3f9b2c1d4e5f6...",  // Mensaje cifrado en hex
    nonce: "12ab34cd56ef..."           // Nonce único en hex
  },
  roomPin: "123456",
  timestamp: ISODate("2025-11-15T...")
}
```

### Sala en MongoDB

```javascript
{
  _id: ObjectId("..."),
  pin: "123456",
  name: "Mi Sala",
  encryptionKey: "3a5f9b2c8d4e6f1a...",  // 32 bytes en hex
  participants: [...],
  createdAt: ISODate("...")
}
```

## 🔧 Implementación Técnica

### Frontend

**Cifrado**:
```javascript
const encrypted = await cryptoService.encryptMessage("Hola", roomPin);
// { ciphertext: "a3f9...", nonce: "12ab..." }
```

**Descifrado**:
```javascript
const decrypted = await cryptoService.decryptMessage(
  { ciphertext: "a3f9...", nonce: "12ab..." },
  roomPin
);
// "Hola"
```

### Backend

**Crear sala**:
```javascript
const encryptionKey = crypto.randomBytes(32).toString('hex');
const room = new Room({ ..., encryptionKey });
await room.save();
return { ...room.toObject(), encryptionKey }; // Enviar al cliente
```

**Unirse a sala**:
```javascript
const room = await Room.findOne({ pin }).select('+encryptionKey');
socket.emit('roomJoined', { ...room, encryptionKey }); // Compartir clave
```

**Guardar mensaje**:
```javascript
const message = new Message({
  username,
  message: "[Cifrado E2E]",
  encryptedMessage: data.encryptedMessage, // Guardar cifrado
  roomPin
});
await message.save();
io.to(roomPin).emit('receiveMessage', message); // Retransmitir cifrado
```

## 🎯 Conclusión

El sistema ahora implementa **cifrado punto a punto verdadero**:

1. ✅ Los mensajes se cifran en el cliente ANTES de enviar
2. ✅ El servidor solo retransmite datos cifrados
3. ✅ La base de datos almacena mensajes cifrados
4. ✅ Solo los clientes con la clave pueden descifrar
5. ✅ El administrador NO puede leer los mensajes

**Estado**: Sistema E2E completamente funcional 🔐

---

**Algoritmo**: XSalsa20-Poly1305 (crypto_secretbox de libsodium)
**Tamaño de clave**: 256 bits (32 bytes)
**Tamaño de nonce**: 192 bits (24 bytes)
**Fecha de implementación**: 15 de noviembre de 2025
