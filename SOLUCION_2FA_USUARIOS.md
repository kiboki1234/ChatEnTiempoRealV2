# Solución: 2FA para Usuarios Regulares

## Problemas Identificados

1. **Error "Invalid password" al desactivar 2FA**: Las rutas de 2FA solo estaban disponibles para administradores (`/api/auth/2fa/*`), pero los usuarios regulares intentaban usarlas con tokens de usuario.

2. **Login no solicita código 2FA**: El endpoint de login de usuarios regulares (`/api/user-auth/login`) no tenía implementada la verificación de 2FA.

## Solución Implementada

### Backend

#### 1. Nuevo Controlador: `user2FAController.js`
- **Ruta**: `backend/controllers/user2FAController.js`
- **Funciones**:
  - `setup2FA`: Genera el secreto 2FA y QR code para usuarios regulares
  - `enable2FA`: Verifica el código y activa 2FA
  - `disable2FA`: Desactiva 2FA (con verificación de contraseña si existe)
  - `get2FAStatus`: Retorna el estado actual de 2FA

#### 2. Rutas Actualizadas: `userAuthRoutes.js`
**Nuevas rutas agregadas:**
```javascript
POST /api/user-auth/2fa/setup    // Configurar 2FA
POST /api/user-auth/2fa/enable   // Activar 2FA
POST /api/user-auth/2fa/disable  // Desactivar 2FA
GET  /api/user-auth/2fa/status   // Obtener estado 2FA
```

**Login actualizado:**
- Ahora acepta el parámetro `twoFactorCode`
- Verifica 2FA si está habilitado
- Retorna `requires2FA: true` cuando se necesita el código
- Guarda contraseña durante registro para validaciones futuras

**Características:**
- Si el usuario tiene 2FA activo y no envía el código, retorna `requires2FA: true`
- Verifica el código 2FA usando `speakeasy.totp.verify()`
- Maneja usuarios con y sin contraseña

#### 3. Registro con Contraseña
**Cambio en `/api/user-auth/register`:**
- Ahora guarda y hashea la contraseña del usuario
- La contraseña se usa para verificar acciones críticas como desactivar 2FA

### Frontend

#### 1. Componente `TwoFactorSetup.js`
**Cambios principales:**

```javascript
// Nueva prop: userRole
const TwoFactorSetup = ({ token, onClose, onUpdate, userRole }) => {
    
    // Función para determinar rutas según rol
    const getBaseRoute = () => {
        return userRole === 'admin' ? '/api/auth' : '/api/user-auth';
    };
    
    // Uso dinámico de rutas
    await axios.post(`${API_URL}${baseRoute}/2fa/setup`, ...);
    await axios.post(`${API_URL}${baseRoute}/2fa/enable`, ...);
    await axios.post(`${API_URL}${baseRoute}/2fa/disable`, ...);
}
```

**Mejoras:**
- Rutas dinámicas según el rol del usuario
- Manejo de usuarios sin contraseña al desactivar 2FA
- Mensajes de error mejorados

#### 2. Componente `AdminPanel.js`
**Cambio:**
```javascript
<TwoFactorSetup
    token={userToken}
    userRole={userRole}  // ← Nueva prop
    onClose={() => setShow2FA(false)}
    onUpdate={(enabled) => { ... }}
/>
```

#### 3. Componente `AuthModal.js`
**Ya implementado correctamente:**
- Maneja el campo de 2FA cuando `requires2FA === true`
- Envía `twoFactorCode` en el login
- Muestra campo específico para ingresar código 2FA

## Flujo Completo de 2FA

### Activar 2FA
1. Usuario hace clic en "Configurar 2FA"
2. Frontend llama a `POST /api/user-auth/2fa/setup`
3. Backend genera secreto y QR code
4. Usuario escanea QR con Google Authenticator
5. Usuario ingresa código de 6 dígitos
6. Frontend llama a `POST /api/user-auth/2fa/enable` con el código
7. Backend verifica y activa 2FA
8. ✅ 2FA activado

### Login con 2FA
1. Usuario ingresa username y password
2. Backend detecta que tiene 2FA activo
3. Backend retorna `requires2FA: true` (HTTP 200)
4. Frontend muestra campo para código 2FA
5. Usuario ingresa código de 6 dígitos
6. Frontend reenvía login con `twoFactorCode`
7. Backend verifica código 2FA
8. ✅ Login exitoso con token JWT

### Desactivar 2FA
1. Usuario hace clic en "Desactivar 2FA"
2. Frontend solicita contraseña mediante prompt
3. Frontend llama a `POST /api/user-auth/2fa/disable` con password
4. Backend verifica contraseña (si existe)
5. Backend desactiva 2FA y elimina secreto
6. ✅ 2FA desactivado

## Casos Especiales

### Usuario sin Contraseña
- Si el usuario se registró sin contraseña (login rápido)
- Puede activar 2FA normalmente
- Al desactivar 2FA, no se requiere contraseña
- Se registra en audit log que no tenía contraseña

### Seguridad
- Códigos 2FA válidos por 30 segundos (TOTP)
- Ventana de tolerancia de ±2 períodos (window: 2)
- Contraseñas hasheadas con bcrypt (10 rounds)
- Logs de auditoría para todas las acciones 2FA

## Archivos Modificados

### Backend
1. ✅ `backend/controllers/user2FAController.js` (NUEVO)
2. ✅ `backend/routes/userAuthRoutes.js` (ACTUALIZADO)

### Frontend
1. ✅ `frontend/src/components/TwoFactorSetup.js` (ACTUALIZADO)
2. ✅ `frontend/src/components/AdminPanel.js` (ACTUALIZADO)

### Sin Cambios (ya funcionaban)
- `frontend/src/components/AuthModal.js` ✓
- `backend/middlewares/authMiddleware.js` ✓
- `backend/models/User.js` ✓

## Cómo Probar

### 1. Reiniciar Backend
```bash
cd backend
node server.js
```

### 2. Reiniciar Frontend
```bash
cd frontend
npm start
```

### 3. Probar Flujo
1. **Registrarse** con usuario nuevo
2. Ir a **Configuración** (ícono de engranaje)
3. Hacer clic en **"Comenzar Configuración"** en sección 2FA
4. **Escanear QR** con Google Authenticator
5. **Ingresar código** y activar 2FA
6. **Cerrar sesión**
7. **Iniciar sesión** nuevamente
8. Verificar que **solicita código 2FA** ✓
9. Ingresar código y verificar acceso
10. Ir a Configuración y **desactivar 2FA**
11. Ingresar contraseña cuando se solicite

## Dependencias

### Backend
- `speakeasy`: Generación y verificación de códigos TOTP
- `bcryptjs`: Hash de contraseñas
- `jsonwebtoken`: Tokens JWT

### Frontend
- `qrcode`: Generación de imágenes QR
- `axios`: Peticiones HTTP

## Variables de Entorno Requeridas

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
```

## Notas de Seguridad

1. **Cambiar JWT_SECRET** en producción
2. **Usar HTTPS** para proteger tokens y códigos 2FA
3. **Rate limiting** en endpoints de autenticación
4. **Backup codes** no implementados (futura mejora)
5. **Recovery email** no implementado (futura mejora)

## Logs de Auditoría

Todas las acciones 2FA se registran:
- `ENABLE_2FA`: Usuario activó 2FA
- `DISABLE_2FA`: Usuario desactivó 2FA
- `LOGIN`: Login con indicador `with2FA: true/false`

## Mejoras Futuras

- [ ] Códigos de respaldo (backup codes)
- [ ] Email de recuperación
- [ ] Notificaciones por email cuando se cambia 2FA
- [ ] Historial de dispositivos confiables
- [ ] Opción de "Recordar dispositivo por 30 días"

---

**Fecha**: 25 de Octubre, 2025
**Estado**: ✅ IMPLEMENTADO Y LISTO PARA PROBAR
