# Diagramas de Secuencia - Sistema de Chat Seguro

## 1. Flujo de Autenticación de Administrador con 2FA

```
Usuario -> Frontend: Ingresa credenciales
Frontend -> Backend: POST /api/auth/login {username, password}
Backend -> Database: Buscar admin
Database -> Backend: Admin encontrado
Backend -> Backend: Verificar password (bcrypt)
Backend -> Backend: Verificar si 2FA está habilitado

alt 2FA Habilitado
    Backend -> Frontend: {requires2FA: true}
    Frontend -> Usuario: Solicitar código 2FA
    Usuario -> Frontend: Ingresa código TOTP
    Frontend -> Backend: POST /api/auth/login {username, password, twoFactorCode}
    Backend -> Backend: Verificar código TOTP (speakeasy)
    
    alt Código válido
        Backend -> Backend: Actualizar lastLogin
        Backend -> Backend: Generar JWT (8h expiración)
        Backend -> AuditLog: Crear log de LOGIN (firmado)
        Backend -> Frontend: {token, admin}
        Frontend -> Usuario: Login exitoso
    else Código inválido
        Backend -> Frontend: {error: "Invalid 2FA code"}
        Frontend -> Usuario: Código 2FA incorrecto
    end
else 2FA Deshabilitado
    Backend -> Backend: Actualizar lastLogin
    Backend -> Backend: Generar JWT
    Backend -> AuditLog: Crear log de LOGIN
    Backend -> Frontend: {token, admin}
    Frontend -> Usuario: Login exitoso
end
```

## 2. Flujo de Creación de Sala Segura

```
Admin -> Frontend: Solicita crear sala
Frontend -> Backend: POST /api/rooms {name, type, maxParticipants}
Backend -> AuthMiddleware: Verificar JWT
AuthMiddleware -> Backend: Token válido, adminId extraído

Backend -> ValidationMiddleware: Validar datos
ValidationMiddleware -> Backend: Datos válidos

Backend -> RateLimitMiddleware: Verificar límite
RateLimitMiddleware -> Backend: Dentro del límite (20/hora)

Backend -> RoomController: createRoom()
RoomController -> RoomController: Generar PIN aleatorio (6 dígitos)
RoomController -> RoomController: Hashear PIN (bcrypt)
RoomController -> RoomController: Generar ID encriptado (AES-256)
RoomController -> Database: Guardar sala
Database -> RoomController: Sala guardada

RoomController -> EncryptionService: generateRoomKey(pin)
EncryptionService -> EncryptionService: Generar clave efímera (32 bytes)
EncryptionService -> RoomController: Clave generada

RoomController -> AuditLog: CREATE_ROOM con firma digital
AuditLog -> AuditLog: Generar firma HMAC-SHA256
AuditLog -> Database: Guardar log inmutable

RoomController -> Backend: Sala creada
Backend -> Frontend: {room: {roomId, pin, name, type}}
Frontend -> Admin: Sala creada exitosamente + PIN
```

## 3. Flujo de Join Room con Sesión Única

```
Usuario -> Frontend: Ingresa PIN y nickname
Frontend -> Backend: Socket.emit('joinRoom', {pin, username})
Backend -> Socket: Evento recibido
Socket -> Socket: Obtener IP del handshake
Socket -> Socket: Generar deviceFingerprint

Socket -> Session: Verificar sesión existente
Session -> Database: Buscar sesión activa
Database -> Session: Sesión encontrada

alt Sesión en otro dispositivo
    Session -> Socket: {allowed: false}
    Socket -> Frontend: roomError("Ya tienes sesión activa")
    Frontend -> Usuario: Error: Sesión en otro dispositivo
else Mismo dispositivo o sin sesión
    Session -> Socket: {allowed: true}
    
    Socket -> Room: findOne({pin, isActive: true})
    Room -> Database: Buscar sala
    Database -> Room: Sala encontrada
    
    Room -> Room: Verificar PIN hash
    Room -> Room: Verificar expiración
    Room -> Room: Verificar capacidad
    
    alt Sala válida y con espacio
        Room -> Database: Agregar participante
        Database -> Room: Participante agregado
        
        Room -> Session: Crear nueva sesión
        Session -> Database: Guardar sesión
        
        Room -> EncryptionService: getRoomKey(pin)
        EncryptionService -> Room: Clave efímera
        
        Room -> AuditLog: JOIN_ROOM (firmado)
        AuditLog -> Database: Log guardado
        
        Room -> Socket: Sala válida + encryptionKey
        Socket -> Frontend: roomJoined({room, encryptionKey})
        Socket -> OtrosClientes: userJoined({username})
        Frontend -> Usuario: Conectado a sala
    else Sala llena/expirada
        Room -> Socket: Error
        Socket -> Frontend: roomError(mensaje)
        Frontend -> Usuario: No se pudo unir
    end
end
```

## 4. Flujo de Subida de Archivo con Detección de Esteganografía

```
Usuario -> Frontend: Selecciona archivo
Frontend -> Frontend: Verificar tipo y tamaño
Frontend -> Backend: POST /api/upload {file, roomPin, username}

Backend -> UploadMiddleware: Recibir archivo
UploadMiddleware -> FileSystem: Guardar temporalmente
FileSystem -> UploadMiddleware: Ruta temporal

UploadMiddleware -> Room: Verificar tipo de sala
Room -> Database: findOne({pin})
Database -> Room: Sala encontrada

alt Sala tipo "text"
    Room -> UploadMiddleware: No permitido
    UploadMiddleware -> FileSystem: Eliminar temporal
    UploadMiddleware -> Frontend: {error: "Sala solo texto"}
else Sala tipo "multimedia"
    UploadMiddleware -> WorkerPool: Asignar worker
    WorkerPool -> SteganographyWorker: Analizar archivo
    
    par Análisis paralelo
        SteganographyWorker -> SteganographyWorker: Calcular entropía Shannon
        SteganographyWorker -> SteganographyWorker: Analizar patrones LSB
        SteganographyWorker -> SteganographyWorker: Analizar canales RGB
        SteganographyWorker -> SteganographyWorker: Verificar metadatos EXIF
    end
    
    SteganographyWorker -> WorkerPool: Resultado de análisis
    WorkerPool -> UploadMiddleware: {suspicious, entropy, lsbAnalysis}
    
    alt Archivo sospechoso (entropy > 7.5 o LSB anómalo)
        UploadMiddleware -> FileSystem: Eliminar temporal
        UploadMiddleware -> AuditLog: FILE_REJECTED (firmado)
        AuditLog -> Database: Guardar log
        UploadMiddleware -> Frontend: {error: "Esteganografía detectada"}
        Frontend -> Usuario: Archivo rechazado
    else Archivo seguro
        UploadMiddleware -> Cloudinary: Subir archivo
        Cloudinary -> UploadMiddleware: URL pública
        
        UploadMiddleware -> FileSystem: Eliminar temporal
        UploadMiddleware -> AuditLog: UPLOAD_FILE (firmado)
        AuditLog -> Database: Guardar log
        
        UploadMiddleware -> Frontend: {fileUrl, securityCheck: passed}
        Frontend -> Usuario: Archivo subido exitosamente
    end
end
```

## 5. Flujo de Envío de Mensaje con Encriptación

```
Usuario -> Frontend: Escribe mensaje
Frontend -> Frontend: Validar longitud (<5000 chars)
Frontend -> EncryptionService: encryptMessage(message, roomKey)
EncryptionService -> EncryptionService: AES-256-GCM
EncryptionService -> Frontend: {encrypted, iv, authTag}

Frontend -> Backend: Socket.emit('sendMessage', {encrypted, username, roomPin})
Backend -> Socket: Evento recibido

Socket -> MessageWorker: Validar y sanitizar
MessageWorker -> MessageWorker: Verificar XSS, injection
MessageWorker -> MessageWorker: Sanitizar HTML
MessageWorker -> Socket: Mensaje validado

Socket -> ChatController: createMessage()
ChatController -> Database: Guardar mensaje encriptado
Database -> ChatController: Mensaje guardado

ChatController -> AuditLog: SEND_MESSAGE (firmado)
AuditLog -> Database: Log guardado

ChatController -> Socket: Mensaje guardado
Socket -> TodosEnSala: io.to(roomPin).emit('receiveMessage', message)

TodosEnSala -> Frontend: Mensaje recibido
Frontend -> EncryptionService: decryptMessage(encrypted, roomKey)
EncryptionService -> Frontend: Mensaje descifrado
Frontend -> Usuario: Mostrar mensaje
```

## 6. Flujo de Configuración de 2FA

```
Admin -> Frontend: Solicitar activar 2FA
Frontend -> Backend: POST /api/auth/2fa/setup
Backend -> AuthMiddleware: Verificar JWT
AuthMiddleware -> Backend: Admin autenticado

Backend -> Admin: findById(adminId)
Admin -> Database: Buscar admin
Database -> Admin: Admin encontrado

Admin -> Speakeasy: generateSecret()
Speakeasy -> Admin: {base32: secret, otpauth_url: qrCode}

Admin -> Database: Guardar twoFactorSecret
Database -> Admin: Secret guardado

Admin -> Backend: {secret, qrCode}
Backend -> Frontend: QR code y secret
Frontend -> Usuario: Mostrar QR para escanear

Usuario -> AuthApp: Escanear QR (Google Authenticator, etc.)
AuthApp -> Usuario: Código TOTP generado

Usuario -> Frontend: Ingresar código TOTP
Frontend -> Backend: POST /api/auth/2fa/enable {twoFactorCode}
Backend -> AuthMiddleware: Verificar JWT

Backend -> Speakeasy: totp.verify(secret, code)
Speakeasy -> Backend: Código válido

Backend -> Admin: twoFactorEnabled = true
Admin -> Database: Actualizar admin
Database -> Admin: Admin actualizado

Backend -> AuditLog: ENABLE_2FA (firmado)
AuditLog -> Database: Log guardado

Backend -> Frontend: {message: "2FA activado"}
Frontend -> Usuario: 2FA configurado exitosamente
```

## 7. Flujo de Verificación de Integridad de Logs

```
Admin -> Frontend: Solicitar auditoría
Frontend -> Backend: GET /api/rooms/:pin/audit
Backend -> AuthMiddleware: Verificar JWT + admin
AuthMiddleware -> Backend: Admin autorizado

Backend -> AuditLog: find({roomPin}).limit(100)
AuditLog -> Database: Buscar logs
Database -> AuditLog: Logs encontrados

loop Para cada log
    AuditLog -> AuditLog: verifySignature()
    AuditLog -> AuditLog: Calcular HMAC-SHA256
    AuditLog -> AuditLog: Comparar firma
    
    alt Firma válida
        AuditLog -> AuditLog: Log íntegro
    else Firma inválida
        AuditLog -> AuditLog: Log comprometido
        AuditLog -> SecurityAlert: Generar alerta
    end
end

AuditLog -> Backend: Logs con estado de integridad
Backend -> Frontend: {logs: [...]}
Frontend -> Admin: Mostrar auditoría
```

## 8. Flujo de Limpieza Automática de Salas Expiradas

```
Sistema -> Scheduler: Cada hora (cron job)
Scheduler -> RoomController: cleanupExpiredRooms()

RoomController -> Room: find({isActive: true, expiresAt: {$lt: now}})
Room -> Database: Buscar salas expiradas
Database -> Room: Salas expiradas

loop Para cada sala expirada
    Room -> Room: isActive = false
    Room -> Database: Actualizar sala
    Database -> Room: Sala desactivada
    
    Room -> EncryptionService: clearRoomKey(pin)
    EncryptionService -> EncryptionService: Eliminar clave efímera
    
    Room -> AuditLog: DELETE_ROOM (automático)
    AuditLog -> Database: Log guardado
end

Room -> RoomController: Total salas limpiadas
RoomController -> Log: "Cleaned up X expired rooms"
```

## Notas Técnicas

### Tecnologías Utilizadas
- **Socket.IO**: Comunicación en tiempo real
- **JWT**: Autenticación stateless
- **Speakeasy**: TOTP para 2FA
- **Bcrypt**: Hashing de passwords y PINs
- **Sharp**: Procesamiento de imágenes
- **Worker Threads**: Concurrencia sin bloqueos
- **Mongoose**: ODM para MongoDB
- **Helmet**: Headers de seguridad
- **Express-validator**: Validación de entrada

### Consideraciones de Seguridad
1. Todos los logs son **inmutables** después de creación
2. Las firmas digitales usan **HMAC-SHA256**
3. La encriptación usa **AES-256-GCM** (authenticated)
4. Las claves de sala son **efímeras** y se eliminan al cerrar
5. El fingerprinting combina **IP + User-Agent + headers**
6. La detección de esteganografía usa **múltiples métodos** en paralelo
