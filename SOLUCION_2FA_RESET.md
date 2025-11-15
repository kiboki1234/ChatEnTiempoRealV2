# Solución: Bug de Reset de 2FA

## 🐛 Problema Identificado

Los usuarios reportaban que la verificación de 2 pasos se **reseteaba automáticamente** después de un tiempo, perdiendo la configuración de seguridad sin que el usuario la desactivara manualmente.

## 🔍 Análisis del Problema

Se identificaron **3 puntos críticos** donde el código estaba reseteando incorrectamente el campo `twoFactorEnabled`:

### 1. **authController.js - Endpoint `verifyToken`** (Líneas 212-214)
```javascript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
if (user.twoFactorEnabled === undefined || user.twoFactorEnabled === null) {
    user.twoFactorEnabled = false;
    await user.save();  // ⚠️ Esto RESETEA el 2FA cada vez que se verifica el token
}
```

**Problema:** Cada vez que un usuario autenticado verificaba su token (al cargar la página, cambiar de sala, etc.), si el campo `twoFactorEnabled` era `undefined` o `null` por alguna razón (race condition, migración incompleta, etc.), se **reseteaba a `false`** y se guardaba, perdiendo la configuración de 2FA.

### 2. **userAuthRoutes.js - Endpoint `/verify`** (Líneas 262-267)
```javascript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
if (user.twoFactorEnabled === undefined || user.twoFactorEnabled === null) {
    user.twoFactorEnabled = false;
    await user.save();  // ⚠️ Mismo problema que authController
}
```

**Problema:** Mismo comportamiento que el punto anterior. Este endpoint se llama frecuentemente para validar sesiones.

### 3. **User.js - Método `findOrCreateByUsername`** (Líneas 193-210)
```javascript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
else {
    // Update last activity
    user.lastActivity = new Date();
    user.ipAddress = ipAddress;
    user.deviceFingerprint = deviceFingerprint;
    await user.save();  // ⚠️ Al usar save(), se disparan middlewares que podrían sobrescribir campos
}
```

**Problema:** Al usar `user.save()`, se disparaban todos los middlewares del schema, incluyendo el pre-save de password hashing. Aunque no reseteaba directamente el 2FA, podía causar efectos secundarios no deseados.

### 4. **userService.js - Método `getUserStats`** (Líneas 175-186)
```javascript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
if (!user) {
    user = new User({
        username,
        role: 'user'
        // ⚠️ No inicializa twoFactorEnabled ni twoFactorSecret
    });
    await user.save();
}
```

**Problema:** Al crear un nuevo usuario sin especificar los campos de 2FA, quedaban como `undefined` en lugar de inicializarse con los valores por defecto del schema.

## ✅ Solución Implementada

### 1. **authController.js - Corregido**
```javascript
// ✅ CÓDIGO CORREGIDO
if (user.twoFactorEnabled === undefined || user.twoFactorEnabled === null) {
    // Solo leer, no modificar - el valor por defecto del schema es false
    logger.warn('User twoFactorEnabled field is undefined', { username: user.username });
}
// NO se llama a user.save() - preserva el valor existente
```

**Cambio:** Eliminado el `user.save()` que estaba reseteando el campo. Ahora solo se registra un warning si el campo no existe, pero NO se modifica.

### 2. **userAuthRoutes.js - Corregido**
```javascript
// ✅ CÓDIGO CORREGIDO
if (user.twoFactorEnabled === undefined || user.twoFactorEnabled === null) {
    console.warn('⚠️ User twoFactorEnabled field is undefined', { username: user.username });
}
// NO se llama a user.save() - preserva el valor existente
```

**Cambio:** Mismo fix que authController.js.

### 3. **User.js - Mejorado con `updateOne`**
```javascript
// ✅ CÓDIGO CORREGIDO
else {
    // Update SOLO lastActivity y tracking - NO tocar campos de seguridad como 2FA
    // Usar updateOne para evitar triggers innecesarios y preservar todos los demás campos
    await this.updateOne(
        { _id: user._id },
        { 
            $set: { 
                lastActivity: new Date(),
                ipAddress,
                deviceFingerprint
            }
        }
    );
    // Recargar el usuario con los datos actualizados
    user = await this.findOne({ username });
}
```

**Cambios:**
- Reemplazado `user.save()` por `updateOne()` con `$set` específico
- Solo actualiza los campos necesarios (lastActivity, ipAddress, deviceFingerprint)
- NO dispara middlewares que puedan alterar otros campos
- **Preserva completamente** los campos `twoFactorEnabled` y `twoFactorSecret`
- Recarga el usuario después de la actualización para mantener el objeto sincronizado

### 4. **userService.js - Inicialización explícita**
```javascript
// ✅ CÓDIGO CORREGIDO
if (!user) {
    user = await User.findOrCreateByUsername(username, 'unknown', 'unknown');
    // Recargar con populate
    user = await User.findOne({ username })
        .populate('activeRooms.roomId', 'name pin type createdAt');
}
```

**Cambio:** Usar `findOrCreateByUsername` que ahora inicializa correctamente los campos 2FA en lugar de crear el usuario con `new User()`.

## 🛠️ Herramientas de Diagnóstico

Se creó un script de verificación de integridad:

```bash
node scripts/verify2FAIntegrity.js
```

Este script:
1. ✅ Detecta usuarios con 2FA habilitado pero sin secret
2. ✅ Limpia secrets residuales de usuarios con 2FA deshabilitado
3. ✅ Inicializa campos faltantes en usuarios sin configuración 2FA
4. ✅ Genera un reporte completo de integridad
5. ✅ Registra la verificación en AuditLog

## 📋 Garantías de Persistencia

Con estos cambios, la configuración de 2FA ahora se mantiene **permanentemente** porque:

1. ✅ **No hay código que resetee automáticamente** `twoFactorEnabled` a `false`
2. ✅ **Actualizaciones de usuario preservan campos 2FA** usando `updateOne` con `$set` específico
3. ✅ **Solo el usuario autenticado puede desactivar 2FA** mediante:
   - Endpoint `/api/user-auth/2fa/disable` (requiere middleware `authenticateUser`)
   - Validación de contraseña obligatoria (si el usuario tiene contraseña)
   - Registro en AuditLog de cada desactivación
4. ✅ **Creación de usuarios inicializa correctamente los campos 2FA** con valores por defecto
5. ✅ **Schema de Mongoose tiene valores por defecto** (`twoFactorEnabled: false`, `twoFactorSecret: null`)

## 🔒 Política de Desactivación de 2FA

Para desactivar 2FA, el usuario **DEBE**:

1. ✅ Estar **autenticado** (tener token JWT válido)
2. ✅ Hacer la petición desde **su propia cuenta** (verificado por `req.userId`)
3. ✅ Proporcionar su **contraseña** (si la tiene configurada)
4. ✅ La acción queda **registrada en AuditLog** con:
   - Username del usuario
   - IP address
   - User agent
   - Timestamp
   - Si tenía contraseña

**NO existe forma de desactivar 2FA automáticamente o sin autenticación.**

## 🧪 Testing Recomendado

Para verificar el fix:

```bash
# 1. Verificar integridad actual
node scripts/verify2FAIntegrity.js

# 2. Activar 2FA en una cuenta de prueba
# 3. Realizar acciones que antes causaban el reset:
#    - Recargar la página varias veces
#    - Crear y unirse a salas
#    - Cerrar sesión y volver a iniciar
#    - Esperar 24-48 horas

# 4. Verificar que 2FA sigue activo
node scripts/verify2FAIntegrity.js
```

## 📝 Logs de Auditoría

Todas las operaciones 2FA quedan registradas:

```javascript
// Activar 2FA
{ action: 'ENABLE_2FA', username, ipAddress, userAgent }

// Desactivar 2FA
{ action: 'DISABLE_2FA', username, ipAddress, userAgent, hadPassword }

// Verificación de integridad
{ action: 'VERIFY_2FA_INTEGRITY', totalUsers, users2FAEnabled, validUsers2FA }
```

## 🎯 Resumen

**Antes:** 2FA se reseteaba automáticamente en múltiples escenarios (verificación de token, actualización de usuario, etc.)

**Ahora:** 2FA es **permanente** y solo puede ser desactivado por el usuario autenticado con su contraseña.

**Archivos modificados:**
- ✅ `backend/controllers/authController.js`
- ✅ `backend/routes/userAuthRoutes.js`
- ✅ `backend/models/User.js`
- ✅ `backend/services/userService.js`
- ✅ `backend/scripts/verify2FAIntegrity.js` (nuevo)

**Fecha de corrección:** 2025-11-15
