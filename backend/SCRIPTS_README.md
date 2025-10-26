# 🛠️ Scripts de Administración del Sistema

Este directorio contiene scripts útiles para la administración del sistema de chat.

## 📋 Scripts Disponibles

### 1. createAdmin.js - Crear/Actualizar Administradores

Crea un nuevo usuario administrador o convierte un usuario existente a administrador.

**Uso:**
```bash
node createAdmin.js <username> <password>
```

**Ejemplos:**

```bash
# Crear un nuevo administrador
node createAdmin.js admin admin123

# Convertir usuario existente a admin
node createAdmin.js juan123 cualquier_password
```

**Características:**
- ✅ Valida que el username tenga 3-30 caracteres
- ✅ Valida que la contraseña tenga mínimo 6 caracteres
- ✅ Si el usuario ya existe, solo actualiza su rol a 'admin'
- ✅ Si el usuario no existe, lo crea con rol 'admin'
- ✅ Muestra información completa del usuario creado/actualizado

**Salida esperada:**
```
🔌 Conectando a MongoDB...
✅ Conectado a MongoDB

👤 Creando nuevo usuario administrador...
✅ Usuario administrador creado exitosamente!

📊 Información del usuario:
   - Username: admin
   - Role: admin
   - ID: 507f1f77bcf86cd799439011
   - Creado: 2025-10-25T10:30:00.000Z

📝 Próximos pasos:
   1. Inicia sesión con este usuario en la aplicación
   2. Ve a "⚙️ Configuración" en la esquina superior derecha
   3. Configura 2FA en la pestaña "Seguridad" (opcional pero recomendado)
   4. Como admin, tienes acceso ilimitado a crear salas

🔌 Desconectado de MongoDB
```

---

### 2. listUsers.js - Listar Todos los Usuarios

Lista todos los usuarios registrados en el sistema con sus detalles.

**Uso:**
```bash
node listUsers.js
```

**Características:**
- ✅ Muestra estadísticas generales (total usuarios, admins, usuarios con 2FA)
- ✅ Lista cada usuario con su información completa
- ✅ Ordenados por fecha de creación (más recientes primero)
- ✅ Emojis visuales para identificar roles y estado de 2FA

**Salida esperada:**
```
🔌 Conectando a MongoDB...
✅ Conectado a MongoDB

📊 Total de usuarios: 5

════════════════════════════════════════════════════════════════════════════════
👥 Usuarios regulares: 3
⭐ Administradores: 2
🔐 Con 2FA activado: 2
════════════════════════════════════════════════════════════════════════════════

1. ⭐ admin
   Role: ADMIN
   2FA: Activado 🔐
   ID: 507f1f77bcf86cd799439011
   Creado: 25/10/2025, 10:30:00
────────────────────────────────────────────────────────────────────────────────
2. 👤 juan123
   Role: USER
   2FA: Desactivado 🔓
   ID: 507f1f77bcf86cd799439012
   Creado: 24/10/2025, 15:45:00
────────────────────────────────────────────────────────────────────────────────

📝 Para crear un administrador:
   node createAdmin.js <username> <password>

📝 Para cambiar un usuario existente a admin:
   node createAdmin.js <username_existente> <cualquier_password>

🔌 Desconectado de MongoDB
```

---

### 4. migrate2FAFields.js - Migrar Campos 2FA

Agrega los campos `twoFactorEnabled` y `twoFactorSecret` a usuarios existentes que no los tienen.

**Uso:**
```bash
node scripts/migrate2FAFields.js
```

**Características:**
- ✅ Encuentra usuarios sin campos 2FA
- ✅ Agrega `twoFactorEnabled: false` por defecto
- ✅ Agrega `twoFactorSecret: null` por defecto
- ✅ Verifica que la migración fue exitosa
- ✅ Muestra resumen de usuarios actualizados

**Cuándo usar:**
- Después de actualizar el sistema con soporte 2FA
- Si ves `undefined` en el estado de 2FA en el frontend
- Al migrar de una versión antigua sin 2FA

**Salida esperada:**
```
🔄 Conectando a MongoDB...
✅ Conectado a MongoDB

🔄 Buscando usuarios sin campos 2FA...
📊 Usuarios encontrados: 5

🔄 Actualizando usuarios...
✅ Usuarios actualizados: 5

🔍 Verificando actualización...
✅ Migración completada exitosamente

📊 Resumen:
   - Usuarios actualizados: 5
   - Campo twoFactorEnabled agregado
   - Campo twoFactorSecret agregado

👋 Conexión cerrada
```

---

### 3. cleanSessions.js - Limpiar Sesiones

Elimina todas las sesiones activas de la base de datos.

**Uso:**
```bash
node cleanSessions.js
```

**⚠️ Precaución:** Este script elimina TODAS las sesiones. Los usuarios deberán volver a iniciar sesión.

**Cuándo usar:**
- Después de cambios en el sistema de sesiones
- Para resolver problemas de sesiones duplicadas
- Para "resetear" todas las conexiones activas

---

## 🚀 Flujo de Trabajo Recomendado

### Configuración Inicial del Sistema

1. **Crear el primer administrador:**
   ```bash
   node createAdmin.js admin admin123
   ```

2. **Verificar que se creó correctamente:**
   ```bash
   node listUsers.js
   ```

3. **Iniciar sesión en la aplicación:**
   - Usa las credenciales del admin creado
   - Ve a "⚙️ Configuración"
   - Activa 2FA para máxima seguridad

### Gestión de Usuarios

**Para convertir un usuario a administrador:**
```bash
# 1. Ver lista de usuarios actuales
node listUsers.js

# 2. Convertir usuario específico
node createAdmin.js nombre_usuario cualquier_password
```

**Para ver quién tiene 2FA activado:**
```bash
node listUsers.js
```
Verás el emoji 🔐 en usuarios con 2FA activo.

---

## 🔒 Niveles de Acceso en la Aplicación

### 👻 Invitados (isGuest: true)
- ❌ Sin acceso a configuración
- ❌ Sin 2FA
- ❌ Solo "Chat General"
- ❌ No pueden crear salas

### 👤 Usuarios Registrados (role: user)
- ✅ Acceso a configuración
- ✅ Pueden activar 2FA
- ✅ Pueden crear hasta 3 salas activas
- ✅ Límite de 5 salas por hora

### ⭐ Administradores (role: admin)
- ✅ Acceso completo a configuración
- ✅ Pueden activar 2FA
- ✅ Sin límite de salas
- ✅ Panel de estadísticas (próximamente)

---

## 📝 Tips y Mejores Prácticas

### Seguridad de Administradores

1. **Usa contraseñas fuertes:**
   - Mínimo 12 caracteres
   - Combinación de letras, números y símbolos
   - No uses palabras del diccionario

2. **Activa 2FA siempre:**
   - Todos los administradores DEBEN tener 2FA activado
   - Usa Google Authenticator o Microsoft Authenticator
   - Guarda la clave secreta en un gestor de contraseñas

3. **Revisa usuarios regularmente:**
   ```bash
   node listUsers.js
   ```
   - Verifica que no haya usuarios sospechosos
   - Confirma que los admins tienen 2FA activado

### Gestión de Cuentas

**Crear múltiples administradores:**
```bash
node createAdmin.js admin1 password123
node createAdmin.js admin2 password456
node createAdmin.js admin3 password789
```

**Verificar inmediatamente:**
```bash
node listUsers.js
```

---

## 🆘 Solución de Problemas

### "Error: Cannot find module './models/User'"

**Solución:** Ejecuta los scripts desde el directorio `backend`:
```bash
cd backend
node createAdmin.js admin password
```

### "MongoServerError: Authentication failed"

**Solución:** Verifica que el `MONGODB_URI` en `.env` sea correcto.

### "El usuario ya existe"

**Solución:** Si ves este mensaje, el script actualizará el rol del usuario existente a 'admin'. No es un error.

### ¿Cómo eliminar un administrador?

Actualmente no hay script para esto. Opciones:

1. **Usar MongoDB Compass:**
   - Conecta a la base de datos
   - Busca el usuario en la colección `users`
   - Cambia el campo `role` de `admin` a `user`

2. **Crear script personalizado** (próximamente)

---

## 📊 Variables de Entorno Necesarias

Asegúrate de tener estas variables en tu archivo `.env`:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/chatonline
```

Los scripts usan esta URI para conectarse a la base de datos.

---

## 🔄 Próximas Mejoras

- [ ] Script para eliminar usuarios
- [ ] Script para cambiar roles (user ↔ admin)
- [ ] Script para resetear contraseñas
- [ ] Script para desactivar 2FA de un usuario (recuperación)
- [ ] Script para ver sesiones activas
- [ ] Script interactivo con menú

---

**¿Necesitas ayuda?** Consulta la documentación principal en `GUIA_2FA.md` o contacta al equipo de desarrollo.
