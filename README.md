# 💬 Chat en Tiempo Real V2

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.0.0-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-70%2B%20passing-success.svg)](TESTING_GUIDE.md)
[![Coverage](https://img.shields.io/badge/coverage-70%25-yellow.svg)](TESTING_SUMMARY.md)

> Aplicación de chat en tiempo real con encriptación end-to-end, autenticación 2FA, salas privadas y mensajes de voz.

**Universidad de las Fuerzas Armadas ESPE**  
**Desarrollo de Software Seguro**

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Testing](#-testing)
- [Despliegue](#-despliegue)
- [Seguridad](#-seguridad)
- [API Documentation](#-api-documentation)
- [Diagramas](#-diagramas)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## ✨ Características

### 🔐 Seguridad
- **Encriptación End-to-End** con libsodium (XChaCha20-Poly1305)
- **Autenticación 2FA** con Google Authenticator (TOTP)
- **JWT Tokens** para sesiones seguras
- **Rate Limiting** anti-spam
- **Detección de Steganografía** (7 algoritmos)
- **Sistema de Cuarentena** para archivos sospechosos
- **Validación de Contenido** (XSS, SQL injection)
- **Logs Auditables** con firmas HMAC-SHA256

### 💬 Chat
- **Mensajes en Tiempo Real** con Socket.IO
- **Salas Privadas** con PIN único
- **Mensajes de Voz** con grabación integrada
- **Compartir Archivos** (imágenes, documentos)
- **Emojis** integrados
- **Respuestas a Mensajes** (threading)
- **Indicadores de Escritura**
- **Historial Persistente**

### 👥 Usuarios
- **Modo Invitado** (sin registro)
- **Registro con Email**
- **Roles** (Admin, User, Guest)
- **Gestión de Sesiones**
- **Panel de Administración**
- **Límites por Usuario** (salas, mensajes)

### 🏠 Salas
- **Crear Salas Privadas**
- **PIN de 6 Dígitos**
- **Límite de Participantes**
- **Persistencia en MongoDB**
- **Auto-limpieza de Salas Inactivas**

---

## 🏗️ Arquitectura

### Diagrama de Alto Nivel

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[React App]
        B[Socket.IO Client]
        C[Crypto Service]
        D[Components]
    end
    
    subgraph "Backend (Node.js)"
        E[Express Server]
        F[Socket.IO Server]
        G[REST API]
        H[Worker Pool]
    end
    
    subgraph "Servicios"
        I[Encryption Service]
        J[Quarantine Service]
        K[Steganography Detector]
    end
    
    subgraph "Almacenamiento"
        L[(MongoDB)]
        M[Cloudinary]
        N[File System]
    end
    
    A --> B
    A --> D
    B --> F
    D --> G
    
    F --> H
    G --> E
    E --> I
    E --> J
    E --> K
    
    E --> L
    E --> M
    J --> N
    
    style A fill:#61dafb
    style E fill:#68a063
    style L fill:#4db33d
    style M fill:#3448c5
```

### Flujo de Mensajes

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Socket.IO
    participant E as Encryption
    participant W as Worker Pool
    participant DB as MongoDB
    
    C->>C: Encripta mensaje (E2E)
    C->>S: emit('sendMessage')
    S->>W: Validar mensaje
    W->>W: Sanitizar XSS
    W->>W: Detectar spam
    W-->>S: Mensaje validado
    S->>E: Encriptar en servidor
    E->>DB: Guardar mensaje
    DB-->>E: Confirmación
    E-->>S: Mensaje guardado
    S->>C: emit('receiveMessage')
    C->>C: Desencripta mensaje
    C->>C: Mostrar en UI
```

### Arquitectura de Seguridad

```mermaid
graph LR
    subgraph "Cliente"
        A[Usuario] --> B[React App]
        B --> C[libsodium]
    end
    
    subgraph "Capas de Seguridad"
        D[Rate Limiter]
        E[Helmet]
        F[CORS]
        G[JWT Auth]
        H[2FA]
    end
    
    subgraph "Backend"
        I[Express]
        J[Validación]
        K[Encryption]
    end
    
    subgraph "Análisis"
        L[Steganography]
        M[Quarantine]
        N[Worker Pool]
    end
    
    B --> D
    D --> E
    E --> F
    F --> G
    G --> I
    I --> J
    J --> K
    K --> L
    L --> M
    
    style D fill:#ff6b6b
    style E fill:#ff6b6b
    style F fill:#ff6b6b
    style G fill:#ff6b6b
    style H fill:#ff6b6b
```

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 19.0.0 | Framework UI |
| **Socket.IO Client** | 4.8.1 | WebSocket cliente |
| **libsodium-wrappers** | 0.7.15 | Encriptación E2E |
| **PrimeReact** | 10.9.7 | Componentes UI |
| **Axios** | 1.7.9 | HTTP cliente |
| **emoji-picker-react** | 4.12.0 | Selector de emojis |
| **qrcode** | 1.5.4 | Generación QR 2FA |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | ≥18.0.0 | Runtime |
| **Express** | 4.21.2 | Framework web |
| **Socket.IO** | 4.8.1 | WebSocket servidor |
| **MongoDB** | 6.12.0 | Base de datos |
| **Mongoose** | 8.9.2 | ODM MongoDB |
| **JWT** | 9.0.2 | Autenticación |
| **bcryptjs** | 3.0.2 | Hash contraseñas |
| **libsodium-wrappers** | 0.7.15 | Encriptación servidor |
| **Winston** | 3.18.3 | Logging |
| **Helmet** | 8.0.0 | Seguridad HTTP |

### DevOps & Testing

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Jest** | 29.7.0 | Testing framework |
| **Supertest** | 6.3.4 | HTTP testing |
| **React Testing Library** | 16.1.0 | Testing React |
| **GitHub Actions** | - | CI/CD |
| **Render** | - | Hosting backend |

### Servicios Externos

| Servicio | Propósito |
|----------|-----------|
| **Cloudinary** | Almacenamiento de imágenes/archivos |
| **MongoDB Atlas** | Base de datos en la nube |
| **Render** | Hosting y deployment |

---

## 📁 Estructura del Proyecto

```
ChatEnTiempoRealV2/
│
├── 📂 backend/                      # Backend Node.js
│   ├── 📂 __tests__/                # Tests unitarios e integración
│   │   ├── unit/                    # Tests de modelos y servicios
│   │   └── integration/             # Tests de rutas y socket
│   ├── 📂 configs/                  # Configuraciones
│   │   ├── cloudinaryConfig.js      # Config Cloudinary
│   │   └── dbConfig.js              # Config MongoDB
│   ├── 📂 controllers/              # Controladores
│   │   ├── authController.js        # Autenticación
│   │   ├── chatController.js        # Chat
│   │   ├── roomController.js        # Salas
│   │   └── user2FAController.js     # 2FA
│   ├── 📂 middlewares/              # Middlewares
│   │   ├── authMiddleware.js        # JWT validation
│   │   ├── rateLimitMiddleware.js   # Rate limiting
│   │   ├── uploadMiddleware.js      # Multer config
│   │   └── validationMiddleware.js  # Validación inputs
│   ├── 📂 models/                   # Modelos MongoDB
│   │   ├── Admin.js
│   │   ├── AuditLog.js
│   │   ├── Message.js
│   │   ├── Room.js
│   │   ├── Session.js
│   │   └── User.js
│   ├── 📂 routes/                   # Rutas Express
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── securityRoutes.js
│   │   ├── userAuthRoutes.js
│   │   └── userRoutes.js
│   ├── 📂 services/                 # Servicios
│   │   ├── encryptionService.js     # Encriptación
│   │   ├── quarantineService.js     # Cuarentena archivos
│   │   ├── steganographyDetector.js # Detección stego
│   │   ├── userService.js
│   │   ├── workerPool.js            # Worker threads
│   │   └── workers/                 # Workers específicos
│   ├── 📂 scripts/                  # Scripts utilidad
│   │   ├── createAdmin.js
│   │   ├── migrate2FAFields.js
│   │   └── promoteUser.js
│   ├── server.js                    # Punto de entrada
│   ├── socket.js                    # Config Socket.IO
│   └── package.json
│
├── 📂 frontend/                     # Frontend React
│   ├── 📂 public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── service-worker.js
│   └── 📂 src/
│       ├── 📂 components/           # Componentes React
│       │   ├── __tests__/           # Tests de componentes
│       │   ├── AdminPanel.js
│       │   ├── AuthModal.js
│       │   ├── ChatBox.js
│       │   ├── MessageInput.js
│       │   ├── MessageList.js
│       │   ├── RoomManager.js
│       │   ├── RoomParticipants.js
│       │   └── UserStats.js
│       ├── 📂 services/             # Servicios
│       │   ├── __tests__/           # Tests de servicios
│       │   ├── cryptoService.js     # Encriptación E2E
│       │   └── socketService.js     # Socket.IO
│       ├── 📂 styles/               # Estilos CSS
│       ├── App.js
│       ├── index.js
│       └── package.json
│
├── 📂 .github/                      # GitHub Actions
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       ├── codeql-analysis.yml
│       ├── dependency-review.yml
│       ├── health-monitor.yml
│       ├── keep-alive.yml
│       └── lockfile-validation.yml
│
├── 📄 README.md                     # Este archivo
├── 📄 TESTING_GUIDE.md              # Guía de testing
├── 📄 TESTING_SUMMARY.md            # Resumen de tests
├── 📄 DOCUMENTACION.md              # Documentación técnica
├── 📄 CIFRADO_E2E.md                # Guía encriptación
├── 📄 render.yaml                   # Config Render
└── 📄 .gitignore
```

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **MongoDB** ≥ 6.0 (local o Atlas)
- **Git**

### Clonar Repositorio

```bash
git clone https://github.com/kiboki1234/ChatEnTiempoRealV2.git
cd ChatEnTiempoRealV2
```

### Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## ⚙️ Configuración

### Backend (.env)

Crear archivo `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/chatdb
# O MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatdb

# JWT
JWT_SECRET=tu-jwt-secret-muy-largo-y-aleatorio-2024
JWT_EXPIRES_IN=7d

# Encriptación
ENCRYPTION_KEY=clave-encriptacion-32-caracteres!!

# Cloudinary (opcional, para imágenes)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Seguridad
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Render (producción)
RENDER=false
```

### Frontend (.env)

Crear archivo `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Frontend (.env.production)

Para producción:

```env
REACT_APP_API_URL=https://tu-backend.onrender.com
REACT_APP_SOCKET_URL=https://tu-backend.onrender.com
```

---

## 🎯 Ejecución

### Desarrollo

**Backend:**
```bash
cd backend
npm run dev
```
Servidor corriendo en `http://localhost:5000`

**Frontend:**
```bash
cd frontend
npm start
```
App corriendo en `http://localhost:3000`

### Producción

**Backend:**
```bash
cd backend
npm start
```

**Frontend (Build):**
```bash
cd frontend
npm run build
```

---

## 🧪 Testing

### Ejecutar Tests

**Backend:**
```bash
cd backend

# Todos los tests con cobertura
npm test

# Watch mode
npm run test:watch

# Solo unitarios
npm run test:unit

# Solo integración
npm run test:integration

# HTML coverage report
npm run test:coverage
```

**Frontend:**
```bash
cd frontend

# Modo interactivo
npm test

# Con cobertura
npm test -- --coverage --watchAll=false
```

### Cobertura Actual

- **Backend**: ~70% (branches, functions, lines, statements)
- **Frontend**: ~65%
- **Total Tests**: 70+ (50+ unit, 20+ integration)

Ver [TESTING_GUIDE.md](TESTING_GUIDE.md) para detalles completos.

---

## 🌐 Despliegue

### Render (Backend)

1. Crear cuenta en [Render](https://render.com)
2. Conectar repositorio GitHub
3. Configurar variables de entorno
4. Deploy automático desde `main`

**Variables de Entorno Render:**
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
ENCRYPTION_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RENDER=true
```

### Vercel/Netlify (Frontend)

```bash
cd frontend
npm run build

# Deploy con Vercel
vercel --prod

# O con Netlify
netlify deploy --prod
```

### Keep-Alive (Render Free Tier)

El backend incluye auto-ping para mantener Render activo:

```javascript
// Configurado en server.js
setInterval(() => {
    http.get('http://localhost:5000/health');
}, 10 * 60 * 1000); // Cada 10 minutos
```

---

## 🔒 Seguridad

### Capas de Seguridad

```mermaid
graph TD
    A[Request] --> B{Rate Limiter}
    B -->|OK| C{Helmet Headers}
    C --> D{CORS}
    D --> E{JWT Auth}
    E --> F{Input Validation}
    F --> G{Encryption}
    G --> H{Steganography Check}
    H --> I{Quarantine}
    I --> J[Response]
    
    B -->|Block| K[429 Too Many Requests]
    C -->|Block| K
    D -->|Block| L[403 Forbidden]
    E -->|Block| M[401 Unauthorized]
    F -->|Block| N[400 Bad Request]
    H -->|Suspicious| I
```

### Características de Seguridad

1. **Encriptación E2E**
   - libsodium (XChaCha20-Poly1305)
   - Claves por sala
   - Zero-knowledge del servidor

2. **Autenticación 2FA**
   - TOTP (Time-based OTP)
   - Google Authenticator compatible
   - QR code generation

3. **Rate Limiting**
   - 100 requests / 15 minutos
   - Por IP
   - Configurable

4. **Validación de Contenido**
   - Sanitización XSS
   - SQL injection prevention
   - Content Security Policy

5. **Detección de Steganografía**
   - 7 técnicas de detección
   - Sistema de cuarentena
   - Análisis asíncrono

6. **Auditoría**
   - Logs de todas las acciones
   - Winston logging
   - Trazabilidad completa

Ver [CIFRADO_E2E.md](CIFRADO_E2E.md) para detalles de encriptación.

---

## 📚 API Documentation

### REST API

**Base URL**: `http://localhost:5000/api`

#### Auth Endpoints

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "usuario",
  "email": "user@example.com",
  "password": "Password123!"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "usuario",
  "password": "Password123!"
}
```

#### Room Endpoints

```http
GET /api/rooms
Authorization: Bearer {token}
```

```http
POST /api/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Mi Sala",
  "maxParticipants": 10,
  "type": "private"
}
```

### Socket.IO Events

#### Client → Server

| Event | Data | Descripción |
|-------|------|-------------|
| `joinRoom` | `{ pin, username }` | Unirse a sala |
| `leaveRoom` | - | Salir de sala |
| `sendMessage` | `{ roomPin, username, message, imageUrl?, voiceUrl? }` | Enviar mensaje |
| `createRoom` | `{ name, maxParticipants, type, username }` | Crear sala |
| `typing` | `{ roomPin, username, isTyping }` | Indicador de escritura |

#### Server → Client

| Event | Data | Descripción |
|-------|------|-------------|
| `roomJoined` | `{ pin, name, participants, ... }` | Confirmación de join |
| `roomJoinError` | `{ message }` | Error al unirse |
| `receiveMessage` | `{ id, username, message, timestamp, ... }` | Nuevo mensaje |
| `userJoined` | `{ username, participants }` | Usuario entró |
| `userLeft` | `{ username, participants }` | Usuario salió |
| `typingStatus` | `{ username, isTyping }` | Estado de escritura |

---

## 📊 Diagramas

### Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB
    
    U->>F: Ingresar credenciales
    F->>B: POST /api/auth/login
    B->>DB: Verificar usuario
    DB-->>B: Usuario encontrado
    B->>B: Verificar password (bcrypt)
    B->>B: Generar JWT
    B-->>F: JWT + user data
    F->>F: Guardar en localStorage
    F-->>U: Redirigir a chat
    
    Note over F,B: Todas las peticiones posteriores<br/>incluyen JWT en header
```

### Flujo 2FA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    
    U->>F: Habilitar 2FA
    F->>B: POST /api/users/2fa/enable
    B->>B: Generar secret (Speakeasy)
    B->>B: Generar QR code
    B-->>F: QR code + secret
    F-->>U: Mostrar QR
    U->>U: Escanear con<br/>Google Authenticator
    U->>F: Ingresar código 6 dígitos
    F->>B: POST /api/users/2fa/verify
    B->>B: Verificar código (TOTP)
    B->>B: Marcar 2FA como habilitado
    B-->>F: Confirmación
    F-->>U: 2FA activado ✅
```

### Flujo de Encriptación E2E

```mermaid
sequenceDiagram
    participant A as Alice
    participant S as Servidor
    participant B as Bob
    
    Note over A,B: 1. Establecer Claves
    A->>S: joinRoom(pin)
    S->>S: Generar roomKey
    S->>A: roomKey
    B->>S: joinRoom(pin)
    S->>B: roomKey (misma)
    
    Note over A,B: 2. Enviar Mensaje
    A->>A: Encriptar con roomKey<br/>(XChaCha20-Poly1305)
    A->>S: sendMessage(encryptedMsg)
    S->>S: Validar & sanitizar
    S->>S: Re-encriptar en servidor
    S-->>B: receiveMessage(encryptedMsg)
    B->>B: Desencriptar con roomKey
    B->>B: Mostrar mensaje
    
    Note over A,B: Servidor nunca ve<br/>contenido en claro
```

### Arquitectura de Workers

```mermaid
graph TB
    subgraph "Main Thread"
        A[Express Server]
        B[Socket.IO]
    end
    
    subgraph "Worker Pool"
        C[Auth Worker]
        D[Message Worker]
        E[Room Worker]
        F[Encryption Worker]
        G[Stego Worker]
    end
    
    A --> C
    B --> D
    B --> E
    A --> F
    A --> G
    
    C --> H[(MongoDB)]
    D --> H
    E --> H
    
    G --> I[Quarantine<br/>Service]
    
    style A fill:#68a063
    style B fill:#010101
    style H fill:#4db33d
```

---

## 📊 Estado del Proyecto

**Cumplimiento de Requisitos**: ✅ 100% (13/13)  
**Cobertura de Tests**: 70%+  
**Usuarios Simultáneos**: 50+  
**Latencia de Mensajes**: < 1 segundo

Ver [cambios.md](./cambios.md) para requisitos detallados.

---

## 🤝 Contribución

### Guía para Contribuir

1. **Fork** el repositorio
2. **Crea** una rama feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Convenciones de Commits

```
feat: nueva característica
fix: corrección de bug
docs: cambios en documentación
style: formateo, sin cambios de código
refactor: refactorización de código
test: agregar/modificar tests
chore: tareas de mantenimiento
```

### Proceso de PR

1. Asegúrate de que los tests pasen: `npm test`
2. Actualiza documentación si es necesario
3. El PR debe tener una descripción clara
4. Al menos 1 approval requerido
5. CI/CD debe pasar (GitHub Actions)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👥 Autores

- **Universidad de las Fuerzas Armadas ESPE**
- **Desarrollo**: [kiboki1234](https://github.com/kiboki1234)

---

## 🙏 Agradecimientos

- Socket.IO por el framework de WebSockets
- libsodium por la biblioteca de encriptación
- MongoDB por la base de datos
- Render por el hosting
- Cloudinary por el almacenamiento de archivos
- Comunidad de Open Source

---

## 🗺️ Roadmap

### v1.1 (Q1 2025)
- [ ] Video llamadas
- [ ] Compartir pantalla
- [ ] Notificaciones push
- [ ] Modo offline

### v1.2 (Q2 2025)
- [ ] App móvil (React Native)
- [ ] Stickers personalizados
- [ ] Themes personalizables
- [ ] Backup automático

### v2.0 (Q3 2025)
- [ ] Channels (como Discord)
- [ ] Bots y automatización
- [ ] Integración con terceros
- [ ] API pública

---

## 📈 Enlaces Adicionales

- **Documentación Completa**: [DOCUMENTACION.md](./DOCUMENTACION.md)
- **Guía de Testing**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Resumen de Tests**: [TESTING_SUMMARY.md](./TESTING_SUMMARY.md)
- **Encriptación E2E**: [CIFRADO_E2E.md](./CIFRADO_E2E.md)
- **Mensajes de Voz**: [GUIA_MENSAJES_VOZ.md](./GUIA_MENSAJES_VOZ.md)
- **Autenticación 2FA**: [GUIA_2FA.md](./GUIA_2FA.md)

---

<div align="center">

**[⬆ Volver arriba](#-chat-en-tiempo-real-v2)**

Hecho con ❤️ por ESPE

**Fecha**: Noviembre 2025

</div>
