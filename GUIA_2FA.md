# Guía de Autenticación de Dos Factores (2FA)

## 📋 Resumen de la Implementación

Se ha implementado un sistema completo de autenticación de dos factores (2FA) usando TOTP (Time-based One-Time Password), compatible con aplicaciones como Google Authenticator, Microsoft Authenticator, Authy, etc.

**🎯 Disponible para TODOS los usuarios registrados** (no solo administradores)

## 🔧 Crear Usuarios Administradores

### Opción 1: Crear nuevo administrador
```bash
cd backend
node createAdmin.js <username> <password>
```

**Ejemplo:**
```bash
node createAdmin.js admin admin123
```

### Opción 2: Convertir usuario existente a admin
```bash
node createAdmin.js usuario_existente cualquier_password
```

### Listar todos los usuarios
```bash
node listUsers.js
```

Este comando mostrará:
- Total de usuarios
- Cantidad de admins y usuarios regulares
- Cuántos tienen 2FA activado
- Detalles de cada usuario (username, role, 2FA status, fecha de creación)

## 🎯 Componentes Implementados

### Backend
- ✅ Rutas de autenticación 2FA (`/api/auth/2fa/*`)
- ✅ Generación de secretos TOTP con Speakeasy
- ✅ Códigos QR para configuración rápida
- ✅ Verificación de códigos de 6 dígitos
- ✅ Habilitar/deshabilitar 2FA con confirmación de contraseña
- ✅ Integración con login existente

### Frontend
- ✅ **TwoFactorSetup.js** - Wizard de 4 pasos para configuración
- ✅ **AdminPanel.js** - Panel de administración con acceso a configuración
- ✅ **AuthModal.js** - Soporte para códigos 2FA durante login
- ✅ Estilos CSS completos con modo oscuro
- ✅ Librería `qrcode` instalada

## 🚀 Cómo Activar 2FA (Para TODOS los Usuarios Registrados)

### Paso 1: Acceder a Configuración
1. Inicia sesión con tu cuenta **registrada** (no funciona para invitados)
2. En la esquina superior derecha, haz clic en el botón **⚙️ Configuración**
3. Verás el panel de configuración

**Nota:** Los usuarios **invitados** NO tienen acceso a configuración ni 2FA. Deben crear una cuenta primero.

### Paso 2: Configurar 2FA
1. En la pestaña **🔒 Seguridad**, haz clic en **"Configurar 2FA"**
2. Se abrirá un wizard de 4 pasos:

#### **Paso 1: Introducción**
- Lee los beneficios de 2FA
- Haz clic en **"Comenzar Configuración"**

#### **Paso 2: Escanear Código QR**
- Se generará un código QR único para tu cuenta
- Abre tu app de autenticación (Google Authenticator, Microsoft Authenticator, Authy, etc.)
- Escanea el código QR con la app
- **Alternativa manual**: Si no puedes escanear, copia la clave secreta y agrégala manualmente en tu app

#### **Paso 3: Verificar Código**
- Tu app mostrará un código de 6 dígitos
- Ingresa ese código en el campo de verificación
- Haz clic en **"Verificar y Activar"**

#### **Paso 4: Confirmación**
- Si el código es correcto, verás un mensaje de éxito ✅
- Tu 2FA está ahora activo

### Paso 3: Iniciar Sesión con 2FA
1. Cierra sesión (`🚪 Salir`)
2. Vuelve a iniciar sesión con tu usuario y contraseña
3. **Nuevo paso**: Se te pedirá un código de 6 dígitos
4. Abre tu app de autenticación
5. Ingresa el código actual (cambia cada 30 segundos)
6. Haz clic en **"🚀 Entrar"**

## 🔧 Cómo Desactivar 2FA

1. Ve al panel de **⚙️ Configuración**
2. En la sección de seguridad, verás el estado: **🟢 2FA Activado**
3. Haz clic en **"Desactivar 2FA"**
4. Ingresa tu **contraseña** para confirmar
5. Haz clic en **"Confirmar Desactivación"**

## 📱 Apps Recomendadas

- **Google Authenticator** (Android/iOS) - Gratis, simple
- **Microsoft Authenticator** (Android/iOS) - Gratis, respaldo en la nube
- **Authy** (Android/iOS/Desktop) - Gratis, multi-dispositivo
- **1Password** (Pago) - Incluye gestor de contraseñas

## 🛡️ Seguridad Implementada

1. **Secretos únicos**: Cada usuario tiene un secreto TOTP diferente
2. **Códigos temporales**: Los códigos expiran cada 30 segundos
3. **Ventana de tolerancia**: ±30 segundos para compensar desincronización
4. **Verificación de contraseña**: Requerida para desactivar 2FA
5. **JWT tokens**: Autenticación basada en tokens seguros
6. **Audit logs**: Todas las acciones 2FA son registradas

## 🔍 Solución de Problemas

### "Código inválido"
- ✅ Verifica que la hora de tu teléfono esté sincronizada
- ✅ El código cambia cada 30 segundos, asegúrate de usar el actual
- ✅ Si acabas de escanear el QR, espera a que se genere un nuevo código

### "No puedo escanear el QR"
- ✅ Usa la opción de **"Copiar clave secreta"**
- ✅ En tu app, selecciona "Agregar manualmente"
- ✅ Pega la clave secreta copiada

### "Perdí acceso a mi app de autenticación"
- ⚠️ **Importante**: Guarda la clave secreta en un lugar seguro (gestor de contraseñas)
- ⚠️ Contacta a otro administrador para que desactive tu 2FA desde la base de datos
- ⚠️ Considera usar apps con respaldo en la nube (Microsoft Authenticator, Authy)

## 📊 Flujo Técnico

```
Usuario Admin
    ↓
Click "⚙️ Configuración"
    ↓
Panel Admin → Pestaña "Seguridad"
    ↓
Click "Configurar 2FA"
    ↓
TwoFactorSetup Component
    ↓
1. Introducción → 2. QR Code → 3. Verificación → 4. Éxito
    ↓
Backend: POST /api/auth/2fa/setup (genera secreto + QR)
Backend: POST /api/auth/2fa/enable (verifica código + activa)
    ↓
2FA Activado ✅
    ↓
Próximo Login:
    - Username + Password → Backend verifica User.twoFactorEnabled
    - Si true, responde { requires2FA: true }
    - Frontend muestra campo de código 2FA
    - Username + Password + TwoFactorCode → Backend verifica con Speakeasy
    - Si correcto, genera JWT token
```

## 🔗 Archivos Relacionados

### Backend
- `backend/routes/authRoutes.js` - Rutas 2FA
- `backend/controllers/authController.js` - Lógica 2FA
- `backend/models/User.js` - Campos twoFactorSecret, twoFactorEnabled

### Frontend
- `frontend/src/components/TwoFactorSetup.js` - Wizard de configuración
- `frontend/src/components/AdminPanel.js` - Panel de administración
- `frontend/src/components/ChatBox.js` - Integración del panel
- `frontend/src/components/AuthModal.js` - Login con 2FA
- `frontend/src/styles/TwoFactorSetup.css` - Estilos del wizard
- `frontend/src/styles/AdminPanel.css` - Estilos del panel
- `frontend/src/styles/AuthModal.css` - Estilos de login

## 📝 Notas Importantes

1. **Para todos los usuarios**: Cualquier usuario registrado puede activar 2FA, no solo administradores
2. **NO para invitados**: Los usuarios invitados no tienen acceso a 2FA (deben crear una cuenta)
3. **Opcional**: 2FA es opcional, los usuarios pueden elegir no activarlo
4. **Respaldo**: Siempre guarda la clave secreta en un lugar seguro
5. **No compartir**: Nunca compartas tu código QR o clave secreta
6. **Sincronización**: La hora del servidor y el dispositivo deben estar sincronizadas

## 👥 Diferencias entre Roles

### Usuarios Regulares (role: user)
- ✅ Pueden activar 2FA en su cuenta
- ✅ Acceso a configuración de seguridad
- ⚠️ Límites: 3 salas activas, 5 salas por hora

### Administradores (role: admin)
- ✅ Pueden activar 2FA en su cuenta
- ✅ Acceso completo a configuración
- ✅ Pestaña adicional de "Estadísticas" (próximamente)
- ✅ Sin límites de creación de salas

### Invitados (isGuest: true)
- ❌ NO tienen acceso a configuración
- ❌ NO pueden activar 2FA
- ❌ Solo pueden unirse a "Chat General"
- ℹ️ Deben crear una cuenta para acceder a más funciones

## ✅ Estado del Sistema

- ✅ Backend completamente implementado y testeado
- ✅ Frontend con UI completa y funcional
- ✅ Integración con sistema de autenticación existente
- ✅ Estilos responsivos con modo oscuro
- ✅ Manejo de errores y validaciones
- ✅ Documentación completa

## 🎨 Capturas de Pantalla del Flujo

1. **Botón de Configuración** - Aparece en header para admins
2. **Panel de Administración** - Pestañas: Seguridad, Configuración, Estadísticas
3. **Wizard Paso 1** - Introducción con beneficios
4. **Wizard Paso 2** - Código QR + Clave secreta + Apps recomendadas
5. **Wizard Paso 3** - Input de 6 dígitos para verificación
6. **Wizard Paso 4** - Confirmación de éxito
7. **Login con 2FA** - Campo adicional para código después de contraseña

---

**¿Necesitas ayuda?** Contacta al equipo de desarrollo o consulta la documentación técnica en el repositorio.
