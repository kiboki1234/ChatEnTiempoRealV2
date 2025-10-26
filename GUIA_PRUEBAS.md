# Guía de Pruebas - Sistema de Chat Seguro

## 📋 Índice
1. [Preparación del Entorno](#preparación-del-entorno)
2. [Pruebas de Autenticación](#pruebas-de-autenticación)
3. [Pruebas de Salas](#pruebas-de-salas)
4. [Pruebas de Detección de Esteganografía](#pruebas-de-detección-de-esteganografía)
5. [Pruebas de Sesión Única](#pruebas-de-sesión-única)
6. [Pruebas de Rate Limiting](#pruebas-de-rate-limiting)
7. [Pruebas de Auditoría](#pruebas-de-auditoría)
8. [Pruebas de Seguridad](#pruebas-de-seguridad)

---

## Preparación del Entorno

### 1. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Editar `.env` con valores de prueba:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/chat-test
JWT_SECRET=test-jwt-secret-min-32-characters-long-12345
DATA_ENCRYPTION_KEY=12345678901234567890123456789012
ROOM_ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456
ROOM_ENCRYPTION_IV=1234567890123456
AUDIT_SECRET=test-audit-secret-key
```

### 2. Instalar e Iniciar
```bash
npm install
npm run create-admin
npm run dev
```

### 3. Verificar Servidor
```bash
curl http://localhost:5000/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T...",
  "uptime": 1.234
}
```

---

## Pruebas de Autenticación

### Test 1: Login Básico
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123456"
  }'
```

**Resultado esperado:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "...",
    "username": "admin",
    "email": "admin@chatapp.com",
    "twoFactorEnabled": false
  }
}
```

### Test 2: Login con Credenciales Incorrectas
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'
```

**Resultado esperado:** Status 401
```json
{
  "error": "Invalid credentials"
}
```

### Test 3: Configurar 2FA
```bash
# 1. Obtener token
TOKEN="<token del Test 1>"

# 2. Setup 2FA
curl -X POST http://localhost:5000/api/auth/2fa/setup \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "secret": "BASE32SECRET...",
  "qrCode": "otpauth://totp/ChatApp:admin?secret=..."
}
```

### Test 4: Habilitar 2FA
```bash
# Escanear QR con Google Authenticator y obtener código

curl -X POST http://localhost:5000/api/auth/2fa/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "twoFactorCode": "123456"
  }'
```

**Resultado esperado:**
```json
{
  "message": "2FA enabled successfully"
}
```

### Test 5: Login con 2FA
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123456",
    "twoFactorCode": "123456"
  }'
```

---

## Pruebas de Salas

### Test 6: Crear Sala de Texto
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sala de Prueba Texto",
    "type": "text",
    "maxParticipants": 10
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "room": {
    "roomId": "abc123...",
    "pin": "123456",
    "name": "Sala de Prueba Texto",
    "type": "text",
    "maxParticipants": 10,
    "createdAt": "...",
    "expiresAt": null
  }
}
```

### Test 7: Crear Sala Multimedia con Expiración
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sala Multimedia Temporal",
    "type": "multimedia",
    "maxParticipants": 20,
    "expiresIn": 24
  }'
```

### Test 8: Listar Todas las Salas
```bash
curl http://localhost:5000/api/rooms
```

### Test 9: Obtener Info de Sala por PIN
```bash
curl http://localhost:5000/api/rooms/123456
```

### Test 10: Verificar PIN de Sala
```bash
curl -X POST http://localhost:5000/api/rooms/verify \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "123456",
    "providedPin": "123456"
  }'
```

---

## Pruebas de Detección de Esteganografía

### Test 11: Subir Imagen Normal
```bash
# Crear imagen de prueba limpia
convert -size 100x100 xc:white test_clean.jpg

curl -X POST http://localhost:5000/api/upload \
  -F "file=@test_clean.jpg" \
  -F "roomPin=123456" \
  -F "username=testuser"
```

**Resultado esperado:**
```json
{
  "success": true,
  "fileUrl": "https://res.cloudinary.com/...",
  "securityCheck": {
    "passed": true,
    "entropy": "6.234"
  }
}
```

### Test 12: Subir Imagen con Alta Entropía (Simulada)
```bash
# Crear imagen con ruido aleatorio (alta entropía)
convert -size 500x500 plasma: test_high_entropy.jpg

curl -X POST http://localhost:5000/api/upload \
  -F "file=@test_high_entropy.jpg" \
  -F "roomPin=123456" \
  -F "username=testuser"
```

**Resultado esperado:** Status 403
```json
{
  "error": "File rejected: Potential steganography or hidden data detected",
  "details": {
    "entropy": "7.856",
    "reason": "High entropy in color channels"
  }
}
```

### Test 13: Intentar Subir a Sala de Solo Texto
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "file=@test_clean.jpg" \
  -F "roomPin=<pin_sala_texto>" \
  -F "username=testuser"
```

**Resultado esperado:** Status 403
```json
{
  "error": "File uploads not allowed in text-only rooms"
}
```

### Test 14: Archivo Demasiado Grande
```bash
# Crear archivo > 10MB
dd if=/dev/zero of=large_file.bin bs=1M count=11

curl -X POST http://localhost:5000/api/upload \
  -F "file=@large_file.bin" \
  -F "roomPin=123456" \
  -F "username=testuser"
```

**Resultado esperado:** Status 413 o error de multer

---

## Pruebas de Sesión Única

### Test 15: Conectar desde Múltiples Dispositivos
```javascript
// Cliente 1 - Navegador Chrome
const socket1 = io('http://localhost:5000');
socket1.emit('joinRoom', { pin: '123456', username: 'testuser' });

// Cliente 2 - Navegador Firefox (diferente User-Agent)
const socket2 = io('http://localhost:5000');
socket2.emit('joinRoom', { pin: '123456', username: 'testuser' });
```

**Resultado esperado:**
- Cliente 1: Conectado exitosamente
- Cliente 2: Error "Ya tienes sesión activa en otro dispositivo"

### Test 16: Reconexión desde Mismo Dispositivo
```javascript
// Cliente 1 - Desconectar
socket1.disconnect();

// Mismo cliente reconecta
socket1.connect();
socket1.emit('joinRoom', { pin: '123456', username: 'testuser' });
```

**Resultado esperado:** Reconexión exitosa

---

## Pruebas de Rate Limiting

### Test 17: Rate Limit en Login
```bash
# Intentar 11 logins en 15 minutos
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
  echo "Intento $i"
done
```

**Resultado esperado:**
- Intentos 1-10: Status 401 (credenciales inválidas)
- Intento 11: Status 429 (Too Many Requests)

### Test 18: Rate Limit en Creación de Salas
```bash
# Intentar crear 21 salas en 1 hora
for i in {1..21}; do
  curl -X POST http://localhost:5000/api/rooms \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Sala $i\",\"type\":\"text\",\"maxParticipants\":10}"
done
```

**Resultado esperado:**
- Salas 1-20: Creadas
- Sala 21: Status 429

---

## Pruebas de Auditoría

### Test 19: Verificar Logs de Auditoría
```bash
# Obtener logs de una sala
curl http://localhost:5000/api/rooms/123456/audit \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "logs": [
    {
      "action": "CREATE_ROOM",
      "username": "admin",
      "ipAddress": "::1",
      "timestamp": "...",
      "signature": "abc123...",
      "details": {...}
    },
    {
      "action": "JOIN_ROOM",
      "username": "testuser",
      "timestamp": "...",
      "signature": "def456..."
    }
  ]
}
```

### Test 20: Verificar Integridad de Log
```javascript
// Script Node.js
const AuditLog = require('./models/AuditLog');
const mongoose = require('mongoose');

async function verifyLog(logId) {
  await mongoose.connect(process.env.MONGO_URI);
  const log = await AuditLog.findById(logId);
  const isValid = log.verifySignature();
  console.log(`Log ${logId} is ${isValid ? 'VALID' : 'COMPROMISED'}`);
}
```

---

## Pruebas de Seguridad

### Test 21: XSS en Mensajes
```javascript
// Intentar enviar script malicioso
socket.emit('sendMessage', {
  username: 'attacker',
  message: '<script>alert("XSS")</script>',
  roomPin: '123456'
});
```

**Resultado esperado:** Mensaje sanitizado
```
&lt;script&gt;alert("XSS")&lt;/script&gt;
```

### Test 22: SQL Injection en Username
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin\" OR \"1\"=\"1",
    "password": "anything"
  }'
```

**Resultado esperado:** Status 401 (validación previene injection)

### Test 23: JWT Token Expirado
```bash
# Usar token viejo (> 8 horas)
curl http://localhost:5000/api/rooms \
  -H "Authorization: Bearer <expired_token>"
```

**Resultado esperado:** Status 401
```json
{
  "error": "Token expired"
}
```

### Test 24: CORS desde Origen No Permitido
```javascript
// Desde dominio no autorizado
fetch('http://localhost:5000/api/rooms', {
  headers: { 'Origin': 'http://evil.com' }
});
```

**Resultado esperado:** Error CORS

### Test 25: Headers de Seguridad (Helmet)
```bash
curl -I http://localhost:5000/health
```

**Verificar headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=...
```

---

## Pruebas de Concurrencia

### Test 26: Procesamiento Paralelo de Archivos
```bash
# Subir 10 archivos simultáneamente
for i in {1..10}; do
  (curl -X POST http://localhost:5000/api/upload \
    -F "file=@test_image_$i.jpg" \
    -F "roomPin=123456" \
    -F "username=user$i" &)
done
wait
```

**Resultado esperado:** Todos procesados sin bloqueos

### Test 27: Mensajes Concurrentes
```javascript
// 100 mensajes simultáneos
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(
    new Promise((resolve) => {
      socket.emit('sendMessage', {
        username: 'testuser',
        message: `Mensaje ${i}`,
        roomPin: '123456'
      });
      resolve();
    })
  );
}
await Promise.all(promises);
```

**Resultado esperado:** Todos entregados sin pérdida

---

## Checklist de Validación Final

- [ ] ✅ Autenticación funciona con JWT
- [ ] ✅ 2FA se configura y valida correctamente
- [ ] ✅ Salas se crean con tipos correcto (text/multimedia)
- [ ] ✅ PINs son hasheados (no en texto plano en DB)
- [ ] ✅ Detección de esteganografía rechaza imágenes sospechosas
- [ ] ✅ Archivos se suben solo a salas multimedia
- [ ] ✅ Sesión única por dispositivo funciona
- [ ] ✅ Rate limiting bloquea exceso de requests
- [ ] ✅ Logs de auditoría son inmutables
- [ ] ✅ Firmas digitales se verifican correctamente
- [ ] ✅ Validación previene XSS e injection
- [ ] ✅ CORS está configurado correctamente
- [ ] ✅ Headers de seguridad (Helmet) presentes
- [ ] ✅ Encriptación funciona (mensajes y archivos)
- [ ] ✅ Workers procesan en paralelo sin bloqueos
- [ ] ✅ Salas expiran automáticamente

---

## Scripts Útiles

### Generar Imágenes de Prueba
```bash
# Imagen limpia
convert -size 200x200 xc:blue clean_image.jpg

# Imagen con texto oculto (esteganografía)
steghide embed -cf clean_image.jpg -ef secret.txt -p password

# Imagen con alta entropía
convert -size 500x500 plasma: high_entropy.jpg
```

### Monitorear Logs en Tiempo Real
```bash
# En MongoDB
mongosh
use chat-test
db.auditlogs.find().sort({timestamp: -1}).limit(10).pretty()

# Verificar firmas
db.auditlogs.find().forEach(log => {
  print(`Log ${log._id}: Signature present = ${!!log.signature}`);
});
```

### Limpiar Base de Datos de Prueba
```bash
mongosh chat-test --eval "db.dropDatabase()"
npm run create-admin
```

---

## Reportar Resultados

Documentar en formato:
```markdown
### Test #X: [Nombre]
- **Fecha:** 2025-10-25
- **Resultado:** ✅ PASS / ❌ FAIL
- **Observaciones:** [Detalles]
- **Logs relevantes:** [Si aplica]
```

---

## Contacto de Soporte

Para reportar bugs o issues de seguridad:
- Email: security@chatapp.com
- Issue Tracker: [GitHub Issues]
