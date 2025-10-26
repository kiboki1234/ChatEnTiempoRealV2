# 🚀 Guía Rápida de Inicio

## ✅ Resumen de Cambios

### 1. 2FA Disponible para TODOS los Usuarios ✅

Ya no es exclusivo de administradores. **Cualquier usuario registrado** puede:
- Ver el botón **"⚙️ Configuración"** en la parte superior
- Activar 2FA en la pestaña de Seguridad
- Proteger su cuenta con autenticación de dos factores

**Excepción:** Los usuarios **invitados** NO tienen acceso (deben crear una cuenta primero)

### 2. Scripts de Administración ✅

Se crearon scripts útiles para gestionar el sistema:

#### **createAdmin.js** - Crear Administradores
```bash
cd backend
node createAdmin.js admin admin123
```

#### **listUsers.js** - Ver Todos los Usuarios
```bash
cd backend
node listUsers.js
```

---

## 🎯 Cómo Empezar (Paso a Paso)

### Paso 1: Crear tu Primer Administrador

```bash
# Abre una terminal en la carpeta backend
cd backend

# Crea un administrador
node createAdmin.js admin admin123

# Verifica que se creó correctamente
node listUsers.js
```

**Deberías ver:**
```
📊 Total de usuarios: 1
⭐ Administradores: 1
🔐 Con 2FA activado: 0

1. ⭐ admin
   Role: ADMIN
   2FA: Desactivado 🔓
   ID: ...
   Creado: ...
```

---

### Paso 2: Iniciar el Backend

```bash
# Asegúrate de estar en la carpeta backend
cd backend

# Inicia el servidor
node server.js
```

**Deberías ver:**
```
✅ Servidor escuchando en el puerto 5000
✅ Conectado a MongoDB
```

---

### Paso 3: Iniciar el Frontend

```bash
# En otra terminal, ve a la carpeta frontend
cd frontend

# Inicia la aplicación React
npm start
```

El navegador se abrirá automáticamente en `http://localhost:3000`

---

### Paso 4: Probar el Sistema

#### A. Login como Administrador

1. En el navegador, verás el modal de autenticación
2. Haz clic en **"Iniciar Sesión"**
3. Ingresa:
   - **Username:** admin
   - **Password:** admin123
4. Haz clic en **"🚀 Entrar"**

✅ Deberías entrar al chat y ver tu username con la insignia **⭐ ADMIN**

---

#### B. Activar 2FA

1. En la esquina superior derecha, haz clic en **"⚙️ Configuración"**
2. Verás el panel con título "Panel de Administración"
3. En la pestaña **"🔒 Seguridad"**, haz clic en **"Configurar 2FA"**
4. Se abrirá un wizard de 4 pasos:

**Paso 1:** Lee la introducción → **"Comenzar Configuración"**

**Paso 2:** 
- Abre **Google Authenticator** (o similar) en tu teléfono
- Escanea el código QR
- O copia la clave secreta manualmente

**Paso 3:**
- Ingresa el código de 6 dígitos que muestra tu app
- **"Verificar y Activar"**

**Paso 4:**
- ✅ ¡2FA Activado exitosamente!

---

#### C. Probar Login con 2FA

1. Haz clic en **"🚪 Salir"** (esquina superior derecha)
2. Vuelve a hacer login:
   - Username: admin
   - Password: admin123
3. **Nuevo:** Verás un campo adicional **"🔐 Código de Autenticación (2FA)"**
4. Abre tu app de autenticación
5. Ingresa el código de 6 dígitos
6. **"🚀 Entrar"**

✅ Has iniciado sesión con 2FA correctamente!

---

### Paso 5: Crear Usuarios Adicionales

#### Opción A: Desde la Aplicación

1. En el modal de login, haz clic en **"Regístrate aquí"**
2. Ingresa username y password
3. Haz clic en **"✨ Registrarse"**

#### Opción B: Crear más Administradores

```bash
cd backend

# Crear otro admin
node createAdmin.js admin2 password456

# Ver lista actualizada
node listUsers.js
```

---

## 👥 Tipos de Usuarios

### 1. Invitados (👻)
- Acceso temporal sin registro
- Solo pueden usar "Chat General"
- **NO tienen** acceso a configuración
- **NO pueden** activar 2FA

**Cómo crear:**
- En el modal de login, clic en **"👻 Continuar como Invitado"**

---

### 2. Usuarios Regulares (👤)
- Cuenta con username y password
- Pueden crear hasta 3 salas activas
- Límite de 5 salas por hora
- ✅ **Tienen acceso a configuración**
- ✅ **Pueden activar 2FA**

**Cómo crear:**
- Registro normal en la aplicación
- O script: `node createUser.js username password` (próximamente)

---

### 3. Administradores (⭐)
- Todas las funciones de usuarios regulares
- Sin límites de creación de salas
- Panel de administración completo
- Acceso a estadísticas (próximamente)
- ✅ **Pueden activar 2FA**

**Cómo crear:**
```bash
node createAdmin.js admin password
```

---

## 🔍 Verificar Estado del Sistema

### Ver todos los usuarios:
```bash
cd backend
node listUsers.js
```

### Ver quién tiene 2FA activo:
```bash
node listUsers.js
```
Busca el emoji **🔐** junto al usuario

### Ver sesiones activas:
```bash
# Desde MongoDB Compass o Mongo Shell
db.sessions.find({ isActive: true })
```

---

## 🛠️ Comandos Útiles

### Backend
```bash
cd backend

# Iniciar servidor
node server.js

# Crear admin
node createAdmin.js <username> <password>

# Listar usuarios
node listUsers.js

# Limpiar sesiones
node cleanSessions.js
```

### Frontend
```bash
cd frontend

# Iniciar app
npm start

# Build para producción
npm run build

# Verificar paquetes
npm list qrcode
```

---

## 🔐 Mejores Prácticas de Seguridad

### Para Administradores:

1. **Siempre activa 2FA:**
   ```
   admin → ⚙️ Configuración → 🔒 Seguridad → Configurar 2FA
   ```

2. **Usa contraseñas fuertes:**
   - Mínimo 12 caracteres
   - Combinación de letras, números, símbolos

3. **Guarda la clave secreta:**
   - Copia la clave secreta del paso 2
   - Guárdala en un gestor de contraseñas (1Password, Bitwarden)

4. **Revisa usuarios regularmente:**
   ```bash
   node listUsers.js
   ```

### Para Usuarios Regulares:

1. **Activa 2FA (opcional pero recomendado):**
   - Click en "⚙️ Configuración"
   - Sigue los pasos del wizard

2. **No compartas tu código QR:**
   - Es único para tu cuenta
   - Nunca lo muestres en capturas de pantalla

3. **Mantén sincronizada la hora:**
   - Los códigos TOTP dependen de la hora exacta
   - Activa sincronización automática en tu teléfono

---

## 🆘 Solución de Problemas Comunes

### "No veo el botón de Configuración"

**Causa:** Eres un usuario invitado

**Solución:** 
1. Cierra sesión
2. Crea una cuenta real con "Registrarse"
3. Inicia sesión con tu cuenta
4. Ahora verás el botón

---

### "Código 2FA inválido"

**Causas posibles:**
- Hora desincronizada
- Código expirado (cambian cada 30 segundos)
- Escaneaste mal el QR

**Soluciones:**
1. Verifica que la hora de tu teléfono esté sincronizada
2. Espera a que aparezca un código nuevo
3. Si persiste, desactiva y reactiva 2FA

---

### "Cannot find module"

**Causa:** Estás en el directorio incorrecto

**Solución:**
```bash
# Asegúrate de estar en backend
cd backend
node createAdmin.js admin password
```

---

### "MongoDB connection failed"

**Causa:** Error en la URI de MongoDB o red

**Solución:**
1. Verifica tu `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatonline
   ```
2. Verifica tu conexión a internet
3. Verifica que MongoDB Atlas esté accesible

---

## 📊 Estructura de Archivos (Referencia)

```
backend/
├── createAdmin.js          # ← Script para crear admins
├── listUsers.js            # ← Script para listar usuarios
├── cleanSessions.js        # ← Script para limpiar sesiones
├── SCRIPTS_README.md       # ← Documentación de scripts
├── server.js
├── socket.js
├── models/
│   ├── User.js            # twoFactorSecret, twoFactorEnabled
│   └── Session.js
├── routes/
│   └── authRoutes.js      # /api/auth/2fa/*
└── controllers/
    └── authController.js  # Lógica 2FA

frontend/
├── src/
│   ├── components/
│   │   ├── TwoFactorSetup.js   # ← Wizard 2FA
│   │   ├── AdminPanel.js        # ← Panel de configuración
│   │   ├── AuthModal.js         # ← Login con 2FA
│   │   └── ChatBox.js           # ← Botón configuración
│   └── styles/
│       ├── TwoFactorSetup.css
│       ├── AdminPanel.css
│       └── AuthModal.css
└── package.json           # qrcode instalado

GUIA_2FA.md               # ← Guía completa de 2FA
INICIO_RAPIDO.md          # ← Este archivo
```

---

## ✅ Checklist de Verificación

Antes de considerar el sistema "listo", verifica:

- [ ] Backend iniciado sin errores
- [ ] Frontend iniciado sin errores
- [ ] Administrador creado con `createAdmin.js`
- [ ] Puedes hacer login como admin
- [ ] Ves el botón "⚙️ Configuración"
- [ ] Puedes abrir el panel de configuración
- [ ] Puedes activar 2FA con el wizard
- [ ] Código QR se genera correctamente
- [ ] Puedes escanear el QR con Google Authenticator
- [ ] La verificación de código funciona
- [ ] 2FA se activa exitosamente
- [ ] Al hacer logout y login, se pide código 2FA
- [ ] El código 2FA funciona correctamente
- [ ] Puedes desactivar 2FA con contraseña
- [ ] Usuario regular también ve botón de configuración
- [ ] Usuario invitado NO ve botón de configuración
- [ ] `listUsers.js` muestra usuarios correctamente

---

## 🎉 ¡Todo Listo!

Si completaste todos los pasos y el checklist, tu sistema está **100% funcional** con:

- ✅ Autenticación JWT
- ✅ Sistema de roles (admin/user/guest)
- ✅ 2FA para todos los usuarios registrados
- ✅ Panel de configuración
- ✅ Scripts de administración
- ✅ Documentación completa

**Próximos pasos sugeridos:**
- Agregar más funciones al panel de configuración
- Implementar pestaña de estadísticas para admins
- Agregar opción de cambiar contraseña
- Implementar recuperación de cuenta si pierden 2FA

---

**¿Dudas o problemas?** Consulta:
- `GUIA_2FA.md` - Guía detallada de 2FA
- `backend/SCRIPTS_README.md` - Documentación de scripts
- Logs del backend/frontend para errores específicos
