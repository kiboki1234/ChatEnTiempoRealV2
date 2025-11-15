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

### `migrateToE2E.js` ⭐ CRÍTICO
**Propósito:** Migrar salas y mensajes antiguos a cifrado E2E.

**Uso:**
```bash
node scripts/migrateToE2E.js
```

**Qué hace:**
- ✅ Genera claves de cifrado para salas sin clave (creadas antes del cifrado E2E)
- ✅ Cifra TODOS los mensajes históricos usando las claves generadas
- ✅ Actualiza mensajes con formato cifrado (ciphertext + nonce)
- ✅ Verifica la migración completa
- ✅ Muestra estadísticas detalladas del proceso

**⚠️ MUY IMPORTANTE:**
- **Esta operación es IRREVERSIBLE**: Una vez cifrados, los mensajes no pueden volver a texto plano
- **Hacer BACKUP de la BD antes**: Usar `mongodump` o similar
- **Solo ejecutar UNA VEZ**: El script no es idempotente
- **Requiere confirmación**: Pide escribir "SI" para continuar
- **Tiempo de ejecución**: Puede tardar varios minutos con muchos mensajes

**Cuándo ejecutar:**
- **Después de implementar el cifrado E2E por primera vez**
- Si tienes salas/mensajes anteriores a la implementación de cifrado
- Para solucionar errores de "No se pudo descifrar el mensaje" en salas viejas

**Ejemplo de salida:**
```
🔐 Iniciando migración a cifrado E2E...

🔄 Conectando a MongoDB...
✅ Conectado a MongoDB

✅ Libsodium inicializado

📊 Buscando salas sin cifrado...
✅ Encontradas 5 salas sin cifrado

🔑 Generando claves de cifrado para salas...
  ✅ Sala 123456 (Sala General): Clave generada
  ✅ Sala 789012 (Proyecto X): Clave generada
  ...

✅ 5 salas actualizadas con claves de cifrado

📊 Buscando mensajes sin cifrar...
✅ Encontrados 1250 mensajes sin cifrar

🔐 Cifrando mensajes...
  📦 Progreso: 100 mensajes cifrados...
  📦 Progreso: 200 mensajes cifrados...
  ...

============================================================
📊 RESUMEN DE MIGRACIÓN
============================================================
✅ Salas actualizadas con claves: 5
🔐 Mensajes cifrados: 1245
⚠️  Mensajes omitidos: 5
❌ Errores: 0
============================================================

🔍 Verificando migración...

📊 Estado final:
   Salas totales: 8
   Salas con cifrado: 8 (100.0%)
   Mensajes totales: 1245
   Mensajes cifrados: 1245 (100.0%)

✅ ¡Migración completada exitosamente!
🔐 Todos los mensajes y salas ahora tienen cifrado E2E
```

**Antes de ejecutar:**
```bash
# 1. HACER BACKUP
mongodump --uri="tu-uri-mongodb" --out=./backup-pre-e2e

# 2. Verificar que tienes libsodium-wrappers instalado
npm list libsodium-wrappers

# 3. Ejecutar el script
node scripts/migrateToE2E.js
```

**Si algo sale mal:**
```bash
# Restaurar desde el backup
mongorestore --uri="tu-uri-mongodb" ./backup-pre-e2e
```

### `syncRoomCounts.js` ⭐ NUEVO
**Propósito:** Sincronizar contadores de salas activas con la realidad de la base de datos.

**Uso:**
```bash
node scripts/syncRoomCounts.js
```

**Qué hace:**
- ✅ Encuentra todas las salas activas en la BD
- ✅ Cuenta cuántas salas tiene cada usuario
- ✅ Actualiza `stats.activeRoomsCount` de cada usuario
- ✅ Actualiza array `stats.activeRooms` con roomIds correctos
- ✅ Limpia usuarios sin salas activas
- ✅ Muestra usuarios que exceden el límite (3 salas)

**Cuándo ejecutar:**
- Después de corregir bugs en el sistema de límites de salas
- Si usuarios reportan que no pueden crear salas cuando deberían poder
- Si usuarios pueden crear más salas de las permitidas
- Como parte del mantenimiento semanal
- Después de migraciones o cambios en el modelo de Room/User

**Ejemplo de salida:**
```
🚀 Iniciando sincronización de contadores de salas...

✅ Encontradas 9 salas activas

👥 Usuarios con salas activas: 4

✅ andres: 2 → 6 salas
   📌 938974 (espe)
   📌 593301 (espe1)
   📌 585441 (sal)
   📌 794279 (Test1)
   📌 520931 (Test3)
   📌 886315 (Test5)

==================================================
📊 RESUMEN DE SINCRONIZACIÓN
==================================================
✅ Usuarios actualizados: 1
🧹 Usuarios limpiados: 0
❌ Errores: 0
📦 Total salas activas: 9
==================================================

⚠️  USUARIOS QUE EXCEDEN EL LÍMITE (3 salas):
❗ andres: 6 salas
```

### `verifyRoomIntegrity.js` ⭐ NUEVO
**Propósito:** Verificar integridad de las salas activas en la base de datos.

**Uso:**
```bash
node scripts/verifyRoomIntegrity.js
```

**Qué hace:**
- ✅ Detecta salas con nombres duplicados
- ✅ Detecta PINs duplicados (ERROR CRÍTICO)
- ✅ Detecta salas sin creador
- ✅ Verifica que los creadores existan en la BD de usuarios
- ✅ Genera reporte completo de integridad

**Cuándo ejecutar:**
- Si hay reportes de problemas con PINs
- Si usuarios no pueden unirse a salas existentes
- Como parte del mantenimiento semanal
- Después de migraciones o actualizaciones importantes
- Si hay comportamiento extraño en el sistema de salas

**Ejemplo de salida:**
```
🚀 Verificando integridad de salas...

✅ Encontradas 9 salas activas

✅ No hay nombres duplicados
✅ No hay PINs duplicados
✅ Todas las salas tienen creador

⚠️  Usuario "andres123" no existe pero tiene 1 salas:
   📌 363983 (a)

==================================================
📊 RESUMEN DE INTEGRIDAD
==================================================
📦 Total salas activas: 9
👥 Creadores únicos: 4
⚠️  Nombres duplicados: 0
❌ PINs duplicados: 0
⚠️  Salas sin creador: 0
⚠️  Creadores inexistentes: 3
==================================================
```

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
