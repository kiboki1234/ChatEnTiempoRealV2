# 🔍 Diagnóstico de Error "2FA not set up"

## ❌ Problema
Cuando intentas ingresar el código de 6 dígitos, recibes el error: **"2FA not set up"**

## 🔬 Causas Posibles

### 1. El secreto no se guardó en la base de datos
**Síntoma:** El QR se muestra pero al verificar el código da error.

**Solución:**
- Ahora agregué logs detallados al backend
- Cuando inicies el backend, verás:
  ```
  🔧 Setup 2FA - userId: 507f1f77bcf86cd799439011
  ✅ User found: juan123
  ✅ Secret saved for user: juan123
  📱 Secret: JBSWY3DPEHPK3PXP
  ```

### 2. Token JWT no tiene el userId correcto
**Síntoma:** El usuario no se encuentra.

**Cómo verificar:**
- Los logs mostrarán: `❌ User not found: undefined`
- Significa que el middleware no está extrayendo el userId del token

**Solución:** Ya lo arreglé actualizando `authMiddleware.js` para usar `decoded.userId`

### 3. Pasas muy rápido entre pasos
**Síntoma:** Scaneas el QR pero la base de datos aún no se actualizó.

**Solución:**
- Espera 2-3 segundos después de escanear el QR
- Deja que se genere un código nuevo en tu app
- Luego ingresa el código

### 4. La hora no está sincronizada
**Síntoma:** El código es válido pero no funciona.

**Solución:**
- Verifica que la hora de tu PC y teléfono estén sincronizadas
- Windows: Configuración → Hora e idioma → Establecer hora automáticamente
- Android/iOS: Ajustes → Fecha y hora → Automático

---

## ✅ Pasos para Diagnosticar

### Paso 1: Revisar los Logs del Backend

1. **Inicia el backend con los nuevos logs:**
   ```bash
   cd backend
   node server.js
   ```

2. **Registra/Inicia sesión** en la aplicación

3. **Ve a Configuración → Seguridad → Configurar 2FA**

4. **Observa la consola del backend:**

   **Cuando haces clic en "Comenzar Configuración":**
   ```
   🔧 Setup 2FA - userId: 507f1f77bcf86cd799439011
   ✅ User found: tu_username
   ✅ Secret saved for user: tu_username
   📱 Secret: JBSWY3DPEHPK3PXP
   ```

   ✅ **Si ves esto, el secreto SE GUARDÓ correctamente**

5. **Escanea el QR con tu app de autenticación**

6. **Espera a que se genere un nuevo código** (los códigos cambian cada 30 segundos)

7. **Ingresa el código de 6 dígitos**

8. **Observa los logs del backend:**
   ```
   🔐 Enable 2FA - userId: 507f1f77bcf86cd799439011
   🔐 Code received: 123456
   ✅ User found: tu_username
   📱 Has secret: true
   📱 Secret value: JBSWY3DP...
   🔍 Verifying code...
   ✅ Verification result: true
   ```

   ✅ **Si ves esto, el código fue verificado correctamente**

---

### Paso 2: Verificar el Token JWT

Si ves `❌ User not found: undefined`, significa que el token no tiene userId.

**Solución:**

1. **Logout completamente**
2. **Limpia localStorage:**
   - Abre DevTools (F12)
   - Consola → Ejecuta:
     ```javascript
     localStorage.clear()
     ```
3. **Vuelve a hacer login**
4. **Reintenta el flujo 2FA**

El nuevo login ahora genera tokens con `userId` en lugar de `adminId`.

---

### Paso 3: Verificar la Base de Datos (Opcional)

Si tienes MongoDB Compass o acceso a Mongo Shell:

1. **Conecta a tu base de datos**

2. **Busca tu usuario:**
   ```javascript
   db.users.findOne({ username: "tu_username" })
   ```

3. **Verifica estos campos:**
   ```javascript
   {
     "_id": "507f1f77bcf86cd799439011",
     "username": "tu_username",
     "twoFactorSecret": "JBSWY3DPEHPK3PXP",  // ← Debe tener valor
     "twoFactorEnabled": false,               // ← Debe ser false antes de verificar
     ...
   }
   ```

   ✅ Si `twoFactorSecret` tiene un valor, el setup funcionó
   ❌ Si es `null`, el setup falló

---

## 🔄 Flujo Correcto (Paso a Paso)

### 1️⃣ Click "Comenzar Configuración"
```
Frontend → POST /api/auth/2fa/setup
         → Backend genera secreto
         → Backend guarda en DB
         → Backend devuelve { secret, qrCode }
         → Frontend genera imagen QR
         → Frontend muestra QR en pantalla
```

### 2️⃣ Escanear QR con Google Authenticator
```
Tu teléfono → Escanea QR
           → Guarda secreto localmente
           → Genera códigos cada 30 segundos
```

### 3️⃣ Ingresar código de verificación
```
Frontend → POST /api/auth/2fa/enable { twoFactorCode: "123456" }
         → Backend busca usuario
         → Backend verifica que tenga twoFactorSecret
         → Backend valida código con speakeasy.totp.verify()
         → Backend marca twoFactorEnabled = true
         → Backend guarda en DB
         → Frontend muestra éxito ✅
```

---

## 🛠️ Soluciones Rápidas

### Solución 1: Reiniciar el Flujo
1. Cierra el modal de 2FA
2. Vuelve a abrirlo
3. Empieza desde "Comenzar Configuración"
4. **NO USES EL QR ANTERIOR**, genera uno nuevo

### Solución 2: Limpiar Sesión
```javascript
// En la consola del navegador (F12)
localStorage.clear()
location.reload()
```

### Solución 3: Verificar Sincronización de Hora
- **Windows:** Win + I → Hora e idioma → Sincronizar ahora
- **Android:** Ajustes → Fecha y hora → Hora automática
- **iOS:** Ajustes → General → Fecha y hora → Automático

### Solución 4: Usar Código Manual en lugar de QR
1. En el paso 2, copia el "Código secreto manual"
2. En tu app de autenticación:
   - Google Authenticator: + → Introducir clave de configuración
   - Nombre: ChatApp
   - Clave: [pega el código copiado]
   - Tipo: Basado en tiempo
3. Guarda y usa el código generado

---

## 📊 Qué Esperar en los Logs

### ✅ Logs Exitosos
```bash
# Al hacer setup:
🔧 Setup 2FA - userId: 507f1f77bcf86cd799439011
✅ User found: juan123
✅ Secret saved for user: juan123
📱 Secret: JBSWY3DPEHPK3PXP

# Al verificar código:
🔐 Enable 2FA - userId: 507f1f77bcf86cd799439011
🔐 Code received: 456789
✅ User found: juan123
📱 Has secret: true
📱 Secret value: JBSWY3DP...
🔍 Verifying code...
✅ Verification result: true
```

### ❌ Logs de Error

**Error 1: Usuario no encontrado**
```bash
🔧 Setup 2FA - userId: undefined
❌ User not found: undefined
```
**Solución:** Token inválido, hacer logout y login de nuevo

**Error 2: Secreto no guardado**
```bash
🔐 Enable 2FA - userId: 507f1f77bcf86cd799439011
✅ User found: juan123
📱 Has secret: false
📱 Secret value: null
❌ 2FA not set up for user: juan123
```
**Solución:** Volver al paso 1, regenerar QR

**Error 3: Código inválido**
```bash
🔐 Enable 2FA - userId: 507f1f77bcf86cd799439011
✅ User found: juan123
📱 Has secret: true
🔍 Verifying code...
✅ Verification result: false
```
**Solución:** Verificar sincronización de hora, esperar nuevo código

---

## 💡 Tips Adicionales

1. **Espera entre pasos:**
   - Después de escanear el QR, espera 2-3 segundos
   - Deja que se genere un código nuevo
   - Los códigos duran 30 segundos

2. **No reutilices QRs antiguos:**
   - Cada vez que empiezas el setup, se genera un nuevo secreto
   - El QR anterior ya no sirve

3. **Verifica la hora:**
   - TOTP depende de la hora exacta
   - Diferencias de más de 1 minuto causan fallos

4. **Usa el código manual si el QR no funciona:**
   - Es más confiable
   - Elimina problemas de cámara o escaneo

---

## 🆘 Si Nada Funciona

1. **Revisa los logs del backend** (deben estar muy detallados ahora)
2. **Copia los logs** y compártelos para análisis
3. **Verifica que usaste el script `createAdmin.js` o registro normal**
4. **Confirma que el modelo User tiene los campos:**
   - `twoFactorSecret: String`
   - `twoFactorEnabled: Boolean`

---

**¿Los logs muestran algo diferente?** Comparte lo que ves en la consola del backend y podré ayudarte mejor. 🚀
