# Scripts de Utilidad - Backend

Este directorio contiene scripts de mantenimiento y administración para el sistema de chat.

## 📋 Índice de Scripts

### 🔐 Seguridad y Autenticación

#### `verify2FAIntegrity.js` ⭐ NUEVO
**Propósito:** Verificar la integridad de la configuración de 2FA en todos los usuarios.

**Uso:**
```bash
node scripts/verify2FAIntegrity.js
```

**Qué hace:**
- ✅ Detecta usuarios con 2FA habilitado pero sin secret (configuración corrupta)
- ✅ Limpia secrets residuales de usuarios con 2FA deshabilitado
- ✅ Inicializa campos faltantes en usuarios sin configuración 2FA
- ✅ Genera un reporte completo con estadísticas
- ✅ Registra la verificación en AuditLog

**Cuándo ejecutar:**
- Después de actualizar el código relacionado con 2FA
- Si hay reportes de usuarios que perdieron su configuración 2FA
- Como parte del mantenimiento mensual del sistema
- Después de migraciones o actualizaciones de base de datos

**Ejemplo de salida:**
```
🔄 Conectando a MongoDB...
✅ Conectado a MongoDB

🔍 Buscando usuarios con 2FA habilitado pero sin secret...
✅ No se encontraron usuarios con 2FA inconsistente

🔍 Buscando usuarios con secret pero 2FA deshabilitado...
✅ No se encontraron secrets residuales

🔍 Buscando usuarios sin campos de 2FA...
✅ Todos los usuarios tienen campos de 2FA

📊 RESUMEN DE INTEGRIDAD:
   Total de usuarios: 150
   Con 2FA habilitado: 12
   Con 2FA deshabilitado: 138
   2FA configurado correctamente: 12/12

✅ ¡Integridad verificada! Todos los usuarios con 2FA tienen configuración válida

👋 Conexión cerrada
```

#### `migrate2FAFields.js`
**Propósito:** Migrar usuarios existentes para agregar campos de 2FA.

**Uso:**
```bash
node scripts/migrate2FAFields.js
```

**Qué hace:**
- Agrega campos `twoFactorEnabled` y `twoFactorSecret` a usuarios que no los tienen
- Inicializa con valores por defecto (false y null)
- Verifica la migración completada

**Cuándo ejecutar:**
- Una sola vez después de implementar el sistema 2FA
- Si se detectan usuarios sin los campos de 2FA

### 👤 Gestión de Usuarios

#### `createAdmin.js`
**Propósito:** Crear un usuario administrador.

**Uso:**
```bash
node scripts/createAdmin.js
```

**Qué hace:**
- Solicita username y password de forma interactiva
- Crea un usuario con rol 'admin'
- Registra la creación en AuditLog

#### `promoteUser.js`
**Propósito:** Promover un usuario existente a administrador.

**Uso:**
```bash
node scripts/promoteUser.js <username>
```

**Ejemplo:**
```bash
node scripts/promoteUser.js john_doe
```

**Qué hace:**
- Busca el usuario por username
- Cambia su rol de 'user' a 'admin'
- Registra la promoción en AuditLog

## 🔧 Mantenimiento General

### Limpieza de sesiones expiradas
Ejecutar desde el directorio raíz del backend:

```bash
node cleanSessions.js
```

### Listar todos los usuarios
```bash
node listUsers.js
```

## ⚠️ Consideraciones de Seguridad

### Variables de Entorno
Todos los scripts requieren que esté configurado correctamente el archivo `.env` con:

```env
MONGO_URI=mongodb://...
JWT_SECRET=tu-secreto-jwt
```

### Permisos
- Los scripts de administración deben ejecutarse solo por personal autorizado
- Los logs de auditoría registran todas las acciones administrativas
- Nunca compartir passwords o secrets generados por los scripts

### Backup
Antes de ejecutar scripts que modifiquen datos:
1. Hacer backup de la base de datos
2. Probar en entorno de desarrollo primero
3. Verificar logs después de la ejecución

## 📊 Logs y Auditoría

Todas las acciones administrativas quedan registradas en la colección `AuditLog`:

```javascript
{
  action: 'ENABLE_2FA' | 'DISABLE_2FA' | 'VERIFY_2FA_INTEGRITY' | 'CREATE_ADMIN' | 'PROMOTE_TO_ADMIN',
  username: 'usuario',
  ipAddress: 'IP',
  timestamp: Date,
  details: { ... }
}
```

Para consultar logs:
```javascript
db.auditlogs.find({ action: 'VERIFY_2FA_INTEGRITY' }).sort({ createdAt: -1 }).limit(10)
```

## 🆘 Troubleshooting

### Error: "Cannot connect to MongoDB"
- Verificar que MongoDB esté corriendo
- Revisar MONGO_URI en `.env`
- Verificar conectividad de red

### Error: "User not found"
- Verificar que el username sea correcto
- Revisar mayúsculas/minúsculas
- Listar usuarios con `listUsers.js`

### Error: "Duplicate key error"
- El usuario ya existe
- Usar `promoteUser.js` en lugar de `createAdmin.js`

## 📝 Agregar Nuevos Scripts

Al crear un nuevo script:

1. Agregar documentación aquí
2. Incluir manejo de errores apropiado
3. Registrar acciones en AuditLog
4. Cerrar conexión a MongoDB al finalizar
5. Proporcionar mensajes informativos al usuario

**Template básico:**
```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const miScript = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Tu lógica aquí
        
        // Registrar en audit log
        await AuditLog.create({
            action: 'MI_ACCION',
            username: 'system',
            ipAddress: 'localhost',
            details: { ... }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Conexión cerrada');
        process.exit(0);
    }
};

miScript();
```

## 🔗 Referencias

- [Documentación 2FA](../SOLUCION_2FA_RESET.md)
- [Guía de seguridad](../SECURITY_IMPLEMENTATION.md)
- [Modelo de Usuario](../models/User.js)
- [AuditLog](../models/AuditLog.js)
