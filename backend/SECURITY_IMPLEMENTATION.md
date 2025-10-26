# Chat en Tiempo Real - Backend Seguro

Sistema de chat en tiempo real con implementación completa de requisitos de seguridad.

## 🔒 Características de Seguridad Implementadas

### 1. Autenticación y Autorización
- ✅ Sistema de autenticación JWT para administradores
- ✅ Autenticación de dos factores (2FA) opcional con TOTP
- ✅ Hasheado seguro de contraseñas con bcrypt
- ✅ Tokens con expiración y rotación
- ✅ Validación de credenciales con rate limiting

### 2. Tipos de Salas
- ✅ **Salas de texto**: Solo mensajes de texto
- ✅ **Salas multimedia**: Mensajes + subida de archivos
- ✅ PINs hasheados con bcrypt
- ✅ IDs encriptados con AES-256
- ✅ Expiración automática de salas

### 3. Encriptación End-to-End
- ✅ Claves efímeras por sala
- ✅ Encriptación AES-256-GCM para mensajes
- ✅ Encriptación de archivos en tránsito
- ✅ Datos encriptados en reposo
- ✅ Firmas digitales HMAC-SHA256

### 4. Detección de Esteganografía
- ✅ Análisis de entropía de Shannon
- ✅ Detección de anomalías en LSB (Least Significant Bit)
- ✅ Análisis de canales de color RGB
- ✅ Verificación de metadatos EXIF
- ✅ Rechazo automático de archivos sospechosos
- ✅ Procesamiento con Worker Threads

### 5. Concurrencia con Worker Threads
- ✅ Pool de workers para análisis de archivos
- ✅ Workers para encriptación/desencriptación
- ✅ Workers para procesamiento de mensajes
- ✅ Procesamiento paralelo sin bloqueos

### 6. Sesión Única por Dispositivo
- ✅ Fingerprinting de dispositivo
- ✅ Verificación de IP
- ✅ Prevención de múltiples sesiones simultáneas
- ✅ Reconexión automática desde mismo dispositivo

### 7. Auditoría y Logs Inmutables
- ✅ Logs firmados digitalmente
- ✅ Registro de todas las acciones críticas
- ✅ Prevención de modificación/eliminación
- ✅ Verificación de integridad de logs

### 8. Protección contra Ataques
- ✅ Rate limiting granular
- ✅ Helmet.js para headers de seguridad
- ✅ Validación y sanitización de entradas
- ✅ Protección XSS y SQL Injection
- ✅ CORS configurado correctamente
- ✅ Límites de tamaño de payload

### 9. Cumplimiento OWASP Top 10
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A04: Insecure Design
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Authentication Failures
- ✅ A08: Software and Data Integrity
- ✅ A09: Security Logging Failures
- ✅ A10: Server-Side Request Forgery

## 📋 Requisitos

- Node.js >= 16.x
- MongoDB >= 5.x
- NPM o Yarn

## 🚀 Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Crear administrador por defecto:
```bash
npm run create-admin
```

5. Iniciar servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🔧 Configuración

### Variables de Entorno Críticas

```env
# JWT - Mínimo 32 caracteres
JWT_SECRET=tu-secret-super-seguro-de-al-menos-32-caracteres

# Encriptación - Exactamente 32 caracteres
DATA_ENCRYPTION_KEY=12345678901234567890123456789012
ROOM_ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456
ROOM_ENCRYPTION_IV=1234567890123456

# Auditoría
AUDIT_SECRET=tu-secret-para-firmar-logs-de-auditoria
```

## 📡 API Endpoints

### Autenticación (`/api/auth`)

```
POST   /register          - Registrar nuevo admin (restringir en producción)
POST   /login             - Login con credenciales + 2FA opcional
GET    /verify            - Verificar token JWT
POST   /2fa/setup         - Configurar 2FA
POST   /2fa/enable        - Activar 2FA
POST   /2fa/disable       - Desactivar 2FA
```

### Salas (`/api/rooms`)

```
GET    /                  - Listar todas las salas activas
GET    /:pin              - Obtener información de sala
POST   /verify            - Verificar PIN de sala
POST   /                  - Crear sala (requiere admin)
DELETE /:pin              - Eliminar sala (requiere admin)
GET    /stats/all         - Estadísticas (requiere admin)
```

### Archivos (`/api`)

```
POST   /upload            - Subir archivo con verificación de esteganografía
POST   /upload-image      - Subir imagen (backward compatibility)
```

## 🔐 Flujo de Seguridad

### Subida de Archivos (Salas Multimedia)

1. Cliente sube archivo
2. Archivo guardado temporalmente
3. **Análisis en Worker Thread:**
   - Cálculo de entropía de Shannon
   - Análisis de patrones LSB
   - Verificación de canales de color
   - Inspección de metadatos
4. Si sospechoso → Rechazo + Log de seguridad
5. Si pasa → Subida a Cloudinary + Eliminación de temporal
6. Cliente recibe URL del archivo

### Creación de Sala Segura

1. Admin autentica con JWT + 2FA (opcional)
2. Validación de datos de entrada
3. Generación de PIN aleatorio (6 dígitos)
4. Hash del PIN con bcrypt
5. Generación de ID encriptado
6. Creación de clave efímera para encriptación
7. Log de auditoría firmado
8. Respuesta al cliente

### Join Room con Sesión Única

1. Usuario intenta unirse con PIN
2. Verificación de PIN hasheado
3. Generación de fingerprint de dispositivo
4. Verificación de sesión existente
5. Si existe otra sesión activa → Rechazo
6. Creación de sesión nueva
7. Registro en AuditLog
8. Envío de clave de encriptación de sala

## 📊 Modelos de Datos

### Admin
```javascript
{
  username: String,
  email: String,
  password: String (hasheado),
  twoFactorSecret: String,
  twoFactorEnabled: Boolean,
  lastLogin: Date
}
```

### Room
```javascript
{
  roomId: String (encriptado),
  pin: String,
  pinHash: String,
  name: String,
  type: 'text' | 'multimedia',
  maxParticipants: Number,
  createdBy: ObjectId (Admin),
  expiresAt: Date,
  encryptionKey: String,
  participants: [{
    socketId, username, ipAddress,
    deviceFingerprint, joinedAt
  }]
}
```

### AuditLog
```javascript
{
  action: String (enum),
  userId: String,
  username: String,
  ipAddress: String,
  roomPin: String,
  details: Object,
  timestamp: Date (immutable),
  signature: String (HMAC-SHA256)
}
```

### Session
```javascript
{
  userId: String,
  username: String,
  socketId: String,
  ipAddress: String,
  deviceFingerprint: String,
  roomPin: String,
  isActive: Boolean,
  expiresAt: Date
}
```

## 🧪 Testing

### Probar Detección de Esteganografía

```bash
# Subir imagen normal
curl -X POST http://localhost:5000/api/upload \
  -F "file=@image.jpg" \
  -F "roomPin=123456" \
  -F "username=test"

# Debe pasar si entropía < 7.5
```

### Probar 2FA

```bash
# 1. Login y obtener token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}'

# 2. Setup 2FA
curl -X POST http://localhost:5000/api/auth/2fa/setup \
  -H "Authorization: Bearer <token>"

# 3. Escanear QR y activar con código TOTP
curl -X POST http://localhost:5000/api/auth/2fa/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"twoFactorCode":"123456"}'
```

## 📈 Monitoreo y Logs

Los logs de auditoría se almacenan en MongoDB y pueden consultarse:

```javascript
// Todos los logs de una sala
GET /api/rooms/:pin/audit

// Verificar integridad de un log
const log = await AuditLog.findById(logId);
const isValid = log.verifySignature();
```

## 🔨 Mantenimiento

### Limpieza de Salas Expiradas

El sistema ejecuta automáticamente cada hora:
```javascript
await roomController.cleanupExpiredRooms();
```

### Limpieza de Sesiones Inactivas

MongoDB TTL index elimina automáticamente sesiones expiradas.

## 🚨 Consideraciones de Producción

1. **Cambiar TODOS los secrets** en .env
2. **Configurar HTTPS/TLS** obligatorio
3. **Restringir endpoint** `/api/auth/register`
4. **Configurar backup** de MongoDB
5. **Monitorear logs** de auditoría
6. **Rate limiting** según capacidad del servidor
7. **CDN** para archivos estáticos
8. **Firewall** y seguridad de red

## 📝 Licencia

MIT

## 👥 Contribución

Ver CONTRIBUTING.md para guías de contribución.
