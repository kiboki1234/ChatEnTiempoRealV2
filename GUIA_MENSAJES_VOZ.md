# 🎤 Guía de Mensajes de Voz

## Descripción General

La funcionalidad de mensajes de voz permite a los usuarios grabar y enviar mensajes de audio directamente desde el chat, similar a WhatsApp. Los mensajes de voz pasan por el mismo sistema de análisis de seguridad que los demás archivos.

## 🎯 Características

### Grabación de Audio
- ✅ **Interfaz intuitiva** - Modal overlay con diseño moderno
- ✅ **Grabación en tiempo real** - Con contador de tiempo (MM:SS)
- ✅ **Animación visual** - Pulso animado durante la grabación
- ✅ **Múltiples formatos** - WebM, MP4, OGG (con fallback automático)
- ✅ **Control de calidad** - Echo cancellation, noise suppression, auto gain control
- ✅ **Vista previa** - Escuchar el audio antes de enviarlo
- ✅ **Controles completos** - Detener, borrar, enviar

### Seguridad
- 🛡️ **Análisis automático** - Detección de esteganografía y malware
- 🛡️ **Validación de permisos** - Solicitud de acceso al micrófono
- 🛡️ **Manejo de errores** - Mensajes claros si no hay permisos
- 🛡️ **Límite de tamaño** - 10MB máximo por archivo

### Reproducción
- 🎵 **Reproductor inline** - Player HTML5 integrado en el chat
- 🎵 **Controles personalizados** - Play, pause, progreso, volumen
- 🎵 **Diseño consistente** - Estilo WhatsApp en mensajes de voz

## 📁 Archivos Involucrados

### Frontend

#### `frontend/src/components/VoiceRecorder.js`
Componente principal de grabación de voz.

**Características:**
- MediaRecorder API para captura de audio
- Estado de grabación con timer
- Preview de audio antes de enviar
- Manejo de permisos del micrófono
- Limpieza automática de recursos

**Props:**
```javascript
{
  onClose: Function,      // Callback para cerrar el modal
  onSendVoice: Function   // Callback para enviar el audio (recibe Blob)
}
```

**Estados:**
- `idle` - Sin grabar
- `recording` - Grabando audio
- `stopped` - Grabación detenida, lista para enviar

#### `frontend/src/styles/VoiceRecorder.css`
Estilos para el componente de grabación.

**Elementos principales:**
- `.voice-recorder-overlay` - Fondo oscuro con blur
- `.voice-recorder-container` - Modal principal con gradiente
- `.recording-pulse` - Animación de pulso durante grabación
- `.recording-time` - Display del tiempo en formato MM:SS
- `.control-button` - Botones de control (stop, delete, send)

**Animaciones:**
- `fadeIn` - Aparición del overlay
- `slideUp` - Entrada del modal
- `pulse` - Efecto de pulso en círculos
- `bounce` - Rebote del icono de micrófono

#### `frontend/src/components/MessageInput.js`
Integración del grabador de voz en el input de mensajes.

**Nuevas características:**
- Botón de micrófono con animación de pulso
- Estado `showVoiceRecorder` para mostrar/ocultar modal
- Función `handleVoiceSend` para procesar y enviar audio
- Validación y análisis de seguridad para archivos de voz

#### `frontend/src/styles/sendMessages.css`
Estilos para el botón de voz en el input.

**Nuevo CSS:**
```css
.voice-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  /* Animación de pulso continua */
  animation: pulse-ring 2s ease-out infinite;
}
```

### Backend

#### `backend/middlewares/uploadMiddleware.js`
Middleware de subida de archivos actualizado.

**Cambios:**
- Agregado `audio/webm` a tipos permitidos
- Agregado `video/webm` a tipos permitidos (formato contenedor)
- Cloudinary configurado para aceptar formatos de audio

**Tipos de audio soportados:**
```javascript
'audio/mpeg',  // MP3
'audio/mp3',   // MP3 alternativo
'audio/wav',   // WAV
'audio/ogg',   // OGG
'audio/x-m4a', // M4A
'audio/webm'   // WebM (usado por MediaRecorder)
```

## 🚀 Flujo de Uso

### 1. Iniciar Grabación
```
Usuario hace clic en botón de micrófono (🎤)
    ↓
Se abre modal de VoiceRecorder
    ↓
Se solicitan permisos de micrófono
    ↓
MediaRecorder inicia captura de audio
    ↓
Timer comienza a contar (00:00)
    ↓
Animación de pulso se activa
```

### 2. Durante la Grabación
```
Usuario habla al micrófono
    ↓
Audio se captura en formato WebM/MP4/OGG
    ↓
Timer incrementa en tiempo real
    ↓
Chunks de audio se almacenan en array
    ↓
Usuario puede ver tiempo transcurrido
```

### 3. Detener Grabación
```
Usuario hace clic en botón "Detener"
    ↓
MediaRecorder detiene captura
    ↓
Chunks se convierten en Blob
    ↓
Se crea URL local para preview
    ↓
Aparece player de audio
    ↓
Usuario puede escuchar el mensaje
```

### 4. Enviar o Borrar
```
Opción 1: ENVIAR
Usuario hace clic en "Enviar" (✓)
    ↓
handleVoiceSend recibe el Blob
    ↓
Se crea FormData con archivo
    ↓
POST a /api/upload
    ↓
Backend analiza seguridad
    ↓
Si aprobado: sube a Cloudinary
    ↓
URL se envía via Socket.IO
    ↓
Mensaje aparece en chat

Opción 2: BORRAR
Usuario hace clic en "Borrar" (🗑️)
    ↓
Audio se descarta
    ↓
Vuelve al estado inicial
    ↓
Puede grabar nuevamente
```

## 🛡️ Análisis de Seguridad

Los mensajes de voz pasan por el mismo pipeline de seguridad que otros archivos:

### Etapas de Análisis
1. **Validación de tipo** - Verificar que sea audio válido
2. **Análisis de contenido** - Detección de esteganografía en el stream de audio
3. **Verificación de malware** - Búsqueda de patrones sospechosos
4. **Cálculo de riesgo** - Puntaje de riesgo basado en factores detectados
5. **Decisión** - Aprobar o rechazar según el riesgo

### Factores de Riesgo
```javascript
{
  riskScore: 0-100,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  riskFactors: [
    'Alta entropía detectada',
    'Patrones irregulares en el audio',
    'Metadatos sospechosos',
    'Estructura de archivo alterada'
  ]
}
```

## 🎨 Diseño UI/UX

### Colores
- **Botón de voz**: Verde (#10b981) - Representa acción positiva de grabar
- **Fondo del modal**: Gradiente púrpura (#667eea → #764ba2)
- **Botón detener**: Rojo (#ef4444) - Acción destructiva clara
- **Botón enviar**: Verde (#10b981) - Confirmar envío

### Animaciones
- **pulse-ring**: Animación continua en el botón de voz (llama la atención)
- **pulse**: Círculos expandiéndose durante grabación (feedback visual)
- **bounce**: Icono de micrófono rebotando (interactividad)
- **slideUp**: Modal entrando desde abajo (transición suave)
- **fadeIn**: Overlay apareciendo gradualmente (no invasivo)

### Iconografía
- 🎤 **FaMicrophone** - Botón de inicio de grabación
- ⏹️ **FaStop** - Detener grabación
- 🗑️ **FaTrash** - Borrar y volver a grabar
- ✓ **FaCheck** - Enviar mensaje de voz
- ✕ **FaTimes** - Cerrar modal

## 📱 Responsive Design

### Desktop (>768px)
- Modal de 450px de ancho
- Botones grandes y espaciados
- Animaciones completas
- Timer de 36px

### Mobile (<768px)
- Modal de 95% del ancho de pantalla
- Botones compactos (20px de padding)
- Timer de 28px
- Pulso de 100px en lugar de 120px

## 🔧 Configuración de Audio

### MediaRecorder Settings
```javascript
{
  mimeType: 'audio/webm;codecs=opus', // Mejor compresión
  audioBitsPerSecond: 128000,         // 128kbps - calidad alta
  echoCancellation: true,             // Cancela eco
  noiseSuppression: true,             // Reduce ruido de fondo
  autoGainControl: true               // Normaliza volumen
}
```

### Formatos con Fallback
1. **audio/webm;codecs=opus** - Primera opción (mejor compresión)
2. **audio/webm** - Segunda opción (compatibilidad WebM)
3. **audio/mp4** - Tercera opción (Safari)
4. **audio/ogg** - Cuarta opción (Firefox antiguo)

## 🐛 Manejo de Errores

### Permisos Denegados
```javascript
if (error.name === 'NotAllowedError') {
  alert('⚠️ Permiso denegado. Por favor, permite el acceso al micrófono.');
}
```

### Micrófono No Encontrado
```javascript
if (error.name === 'NotFoundError') {
  alert('⚠️ No se encontró micrófono. Por favor, conecta un micrófono.');
}
```

### Error de Subida
```javascript
if (error.response?.status === 403) {
  // Archivo rechazado por seguridad
  alert(`🚫 Mensaje de voz rechazado\nRazón: ${errorData.error}`);
}
```

## 📊 Métricas y Limitaciones

### Límites
- **Tamaño máximo**: 10MB por archivo de voz
- **Duración recomendada**: Hasta 5 minutos
- **Formato**: WebM/MP4/OGG
- **Bitrate**: 128kbps

### Performance
- **Tiempo de análisis**: ~1-3 segundos para 1MB
- **Tiempo de subida**: Depende de la conexión
- **Tiempo de procesamiento total**: ~2-5 segundos en promedio

## 🔄 Estados del Componente

### VoiceRecorder Component States
```javascript
{
  isRecording: false,           // Está grabando?
  recordingTime: 0,             // Tiempo en segundos
  mediaRecorder: null,          // Instancia de MediaRecorder
  audioChunks: [],              // Chunks de audio capturados
  audioBlob: null,              // Blob final del audio
  audioUrl: null,               // URL local para preview
  error: null                   // Mensaje de error si hay
}
```

### MessageInput Additional States
```javascript
{
  showVoiceRecorder: false,     // Mostrar modal de voz?
  isUploading: false,           // Subiendo archivo?
  uploadProgress: ''            // Mensaje de progreso
}
```

## 🧪 Testing

### Casos de Prueba
1. ✅ **Grabación básica**
   - Iniciar grabación
   - Detener después de 5 segundos
   - Verificar que el timer muestre 00:05

2. ✅ **Preview de audio**
   - Grabar mensaje
   - Detener grabación
   - Reproducir preview
   - Verificar que se escuche correctamente

3. ✅ **Envío exitoso**
   - Grabar mensaje
   - Enviar
   - Verificar que aparezca en el chat como player de audio

4. ✅ **Borrar y regrabar**
   - Grabar mensaje
   - Hacer clic en borrar
   - Grabar nuevo mensaje
   - Enviar segundo mensaje

5. ✅ **Permisos**
   - Denegar permisos de micrófono
   - Verificar mensaje de error
   - Permitir permisos
   - Verificar que funcione

6. ✅ **Análisis de seguridad**
   - Grabar mensaje normal
   - Verificar que pase análisis
   - Verificar que se muestre indicador de análisis

## 🔐 Consideraciones de Seguridad

### Audio Steganography Detection
El sistema detecta:
- Datos ocultos en LSB (Least Significant Bits)
- Patrones inusuales de frecuencia
- Metadatos manipulados
- Estructuras de archivo alteradas
- Alta entropía en segmentos del audio

### Prevención de Abuso
- Límite de tamaño de archivo
- Validación de tipo MIME
- Análisis antes de subida a Cloudinary
- Rate limiting en el endpoint de upload
- Logs de auditoría para mensajes de voz

## 📚 Referencias

### APIs Utilizadas
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MediaStream API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [HTML5 Audio Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)

### Librerías
- React Icons (FaMicrophone, FaStop, FaTrash, FaCheck)
- Axios (para upload)
- Socket.IO (para envío de mensajes)
- Multer (backend file handling)
- Cloudinary (storage de archivos)

## 🎉 Resultado Final

Los usuarios ahora pueden:
1. 🎤 **Grabar** mensajes de voz con un clic
2. 👂 **Escuchar** preview antes de enviar
3. 🗑️ **Borrar** y regrabar si no les gusta
4. ✅ **Enviar** mensajes de voz seguros
5. 🎵 **Reproducir** mensajes de voz en el chat
6. 🛡️ **Confiar** en el análisis de seguridad automático

¡La funcionalidad está lista para usar! 🚀
