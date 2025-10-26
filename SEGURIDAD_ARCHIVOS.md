# 🛡️ Sistema de Seguridad de Archivos

## Descripción General

El sistema de chat implementa un **sistema automático de detección de amenazas** que analiza todos los archivos subidos en salas multimedia. Este sistema protege a todos los usuarios detectando:

- 🔍 **Esteganografía**: Datos ocultos en imágenes
- 🦠 **Malware**: Código malicioso embebido
- ⚠️ **Manipulaciones**: Archivos alterados o sospechosos
- 📄 **Contenido peligroso**: Scripts, ejecutables, etc.

## 🚀 Funcionamiento Automático

### Para Todos los Usuarios

Cuando un usuario sube un archivo en una sala multimedia:

1. **📤 Subida**: El archivo se envía al servidor
2. **🔍 Análisis Automático**: El sistema ejecuta múltiples verificaciones de seguridad
3. **✅ Aprobación o ❌ Rechazo**: 
   - Si es seguro: se publica en el chat
   - Si es sospechoso: se rechaza y se informa al usuario

### Indicadores Visuales

Los usuarios ven en tiempo real:

```
📤 Subiendo archivo...
      ↓
🔍 Analizando seguridad del archivo...
      ↓
✅ Archivo verificado y seguro
```

Si el archivo es rechazado:
```
🚫 Archivo rechazado por seguridad
Razón: Detección de anomalías
Severidad: Alta
Puntaje de riesgo: 8/10
```

## 🔬 Análisis de Seguridad

### Verificaciones Realizadas

#### 1. **Análisis de Entropía**
- Calcula la aleatoriedad de los datos
- Umbral: 7.5 bits/byte
- **Detecta**: Datos cifrados o comprimidos ocultos

#### 2. **Test Chi-Cuadrado LSB**
- Analiza los bits menos significativos
- **Detecta**: Esteganografía LSB (técnica común)

#### 3. **Análisis de Metadatos**
- Verifica EXIF, ICC profiles
- **Detecta**: Metadatos sospechosos o excesivos

#### 4. **Estructura de Archivo**
- Busca datos después del marcador de fin
- **Detecta**: Archivos polyglot (múltiples formatos)

#### 5. **Firmas de Herramientas**
- Busca patrones de herramientas de esteganografía
- **Detecta**: OutGuess, StegHide, F5, OpenStego, etc.

#### 6. **Detección de Malware**
- Busca firmas de ejecutables, scripts
- **Detecta**: PE (Windows), ELF (Linux), PHP, JavaScript malicioso

#### 7. **Análisis de Canales de Color**
- Verifica cada canal RGB independientemente
- **Detecta**: Anomalías en canales específicos

#### 8. **PDFs Especiales**
- JavaScript embebido
- Acciones de lanzamiento
- Archivos adjuntos ocultos

### Sistema de Puntuación de Riesgo

| Puntaje | Severidad | Acción |
|---------|-----------|--------|
| 0-3     | BAJA      | ✅ Aprobado |
| 4-6     | MEDIA     | ⚠️ Aprobado con advertencia |
| 7-9     | ALTA      | ❌ Rechazado |
| 10+     | CRÍTICA   | 🚨 Rechazado y cuarentena |

### Factores de Riesgo

Cada factor suma puntos al riesgo total:

- Alta entropía: +3 puntos
- Test Chi-cuadrado fallido: +3 puntos
- Estructura anómala: +3 puntos
- Firmas de herramientas: +4 puntos
- Distribución LSB anormal: +2 puntos
- Metadatos sospechosos: +2 puntos
- Alta entropía en canales: +2 puntos
- **Contenido malicioso**: Rechazo inmediato

## 📋 Para Administradores

### Panel de Seguridad

Los administradores tienen acceso a un panel completo con:

#### 1. **Estadísticas (📊 Resumen)**
- Total de archivos analizados
- Tasa de rechazo
- Distribución por severidad
- Principales factores de riesgo

#### 2. **Cuarentena (🔒 Cuarentena)**
- Lista de archivos rechazados
- Detalles completos de análisis
- Capacidad de eliminar archivos
- Limpieza automática de archivos antiguos (>30 días)

#### 3. **Alertas (🚨 Alertas)**
- Alertas recientes de seguridad
- Archivos rechazados en tiempo real
- Información del usuario y sala

### Acciones Disponibles

```javascript
// Ver archivos en cuarentena
GET /api/security/quarantine

// Ver detalles de un archivo
GET /api/security/quarantine/:fileName

// Eliminar archivo de cuarentena
DELETE /api/security/quarantine/:fileName

// Limpiar archivos antiguos
POST /api/security/quarantine/clean

// Ver estadísticas
GET /api/security/statistics?days=7

// Ver alertas recientes
GET /api/security/alerts?limit=20
```

## 🔧 Configuración Técnica

### Archivos del Sistema

```
backend/
├── services/
│   ├── steganographyDetector.js    # Motor de análisis
│   ├── quarantineService.js        # Gestión de cuarentena
│   └── workerPool.js               # Pool de workers
├── workers/
│   └── steganographyWorker.js      # Análisis en hilos
├── routes/
│   └── securityRoutes.js           # APIs de seguridad
└── middlewares/
    └── uploadMiddleware.js         # Interceptor de uploads
```

### Configuración de Límites

```javascript
MAX_FILE_SIZE = 10 MB              // Tamaño máximo
ENTROPY_THRESHOLD = 7.5            // Umbral de entropía
CHI_SQUARE_THRESHOLD = 50          // Umbral Chi-cuadrado
QUARANTINE_RETENTION = 30 días     // Retención de archivos
```

### Tipos de Archivo Permitidos

- **Imágenes**: JPEG, PNG, GIF, WEBP
- **Documentos**: PDF

## 🔐 Seguridad y Privacidad

### Logs de Auditoría

Cada análisis genera un registro con:
- Timestamp
- Usuario y sala
- Resultado del análisis
- Detalles técnicos
- Dirección IP

### Almacenamiento Seguro

- Archivos temporales eliminados después del análisis
- Archivos sospechosos en cuarentena aislada
- Hashes SHA-256 para integridad
- Metadatos encriptados

### Cumplimiento

El sistema cumple con:
- ✅ OWASP Top 10
- ✅ Mejores prácticas de seguridad
- ✅ Protección contra esteganografía
- ✅ Detección de malware básico
- ✅ Auditoría completa

## 📊 Ejemplos de Uso

### Usuario Subiendo Archivo

```javascript
// Frontend - MessageInput.js
const formData = new FormData();
formData.append('file', image);
formData.append('roomPin', roomPin);
formData.append('username', username);

// Automáticamente se analiza
const response = await axios.post('/api/upload', formData);

// Si pasa: response.data.fileUrl
// Si falla: error 403 con detalles
```

### Administrador Revisando

```javascript
// Ver estadísticas de últimos 7 días
const stats = await fetch('/api/security/statistics?days=7');

// Resultado:
{
  totalAnalyzed: 145,
  approved: 132,
  rejected: 13,
  rejectionRate: "8.97%",
  severityBreakdown: {
    CRITICAL: 2,
    HIGH: 6,
    MEDIUM: 4,
    LOW: 1
  }
}
```

## 🚨 Casos de Rechazo Comunes

### 1. **Imagen con Esteganografía**
```
❌ Archivo rechazado
Severidad: ALTA
Factores de riesgo:
- Alta entropía detectada
- Test Chi-cuadrado fallido
- Distribución LSB anormal
```

### 2. **PDF Malicioso**
```
🚨 Archivo rechazado
Severidad: CRÍTICA
Factores de riesgo:
- JavaScript embebido detectado
- Acciones de lanzamiento presentes
```

### 3. **Archivo Polyglot**
```
❌ Archivo rechazado
Severidad: ALTA
Factores de riesgo:
- Múltiples firmas de formato
- Datos trailing después del marcador de fin
```

## 💡 Recomendaciones

### Para Usuarios
1. Subir solo archivos legítimos
2. Evitar modificar metadatos manualmente
3. No usar herramientas de esteganografía
4. Comprimir imágenes antes de subir

### Para Administradores
1. Revisar estadísticas regularmente
2. Limpiar cuarentena mensualmente
3. Monitorear alertas de seguridad
4. Actualizar umbrales según necesidad

## 🔄 Mantenimiento

### Tareas Automáticas

- **Cada hora**: Limpieza de salas y sesiones
- **Cada 24 horas**: Limpieza de cuarentena (archivos >30 días)

### Tareas Manuales

- Revisar alertas semanalmente
- Ajustar umbrales si hay falsos positivos
- Actualizar firmas de malware
- Backup de logs de auditoría

## 📚 Referencias Técnicas

- **Análisis de Entropía**: Shannon Entropy
- **Chi-cuadrado**: Westfeld & Pfitzmann (1999)
- **LSB Detection**: Fridrich et al. (2001)
- **Steganalysis**: Modern Statistical Methods

## 🆘 Soporte

Si un archivo legítimo es rechazado:
1. Verificar el tamaño (< 10MB)
2. Verificar el formato (JPEG, PNG, GIF, WEBP, PDF)
3. Intentar con versión sin comprimir
4. Contactar al administrador con detalles

---

**Última actualización**: Octubre 2025  
**Versión del sistema**: 2.0  
**Estado**: ✅ Producción
