# 🎤 Prueba de Mensajes de Voz - Lista de Verificación

## ✅ Checklist de Pruebas

### 1. Preparación del Entorno
- [ ] Backend corriendo en el puerto correcto
- [ ] Frontend corriendo en desarrollo
- [ ] Base de datos conectada
- [ ] Cloudinary configurado con credenciales válidas
- [ ] Usuario autenticado en el chat

### 2. Interfaz de Usuario
- [ ] Botón de micrófono (🎤) visible en el input de mensajes
- [ ] Botón tiene color verde (#10b981)
- [ ] Animación de pulso continua en el botón
- [ ] Al hacer hover, el botón crece y la animación se detiene

### 3. Apertura del Modal
- [ ] Clic en botón de micrófono abre modal
- [ ] Modal tiene fondo oscuro con blur
- [ ] Modal tiene gradiente púrpura
- [ ] Animación de entrada suave (slideUp)
- [ ] Botón X para cerrar visible en la esquina

### 4. Solicitud de Permisos
- [ ] Navegador solicita permiso para usar micrófono
- [ ] Si se acepta: grabación inicia automáticamente
- [ ] Si se rechaza: muestra mensaje de error claro
- [ ] Mensaje de error incluye instrucciones para habilitar

### 5. Durante la Grabación
- [ ] Estado muestra "🎤 Grabando..."
- [ ] Timer inicia en 00:00
- [ ] Timer incrementa cada segundo (00:01, 00:02, ...)
- [ ] Animación de pulso visible (3 círculos expandiéndose)
- [ ] Icono de micrófono rebotando
- [ ] Botón "Detener" visible en rojo

### 6. Detener Grabación
- [ ] Clic en "Detener" termina la grabación
- [ ] Timer se detiene
- [ ] Animación de pulso se detiene
- [ ] Estado cambia a "Listo para enviar"
- [ ] Aparece player de audio para preview
- [ ] Botones "Borrar" y "Enviar" visibles

### 7. Preview de Audio
- [ ] Player HTML5 muestra controles nativos
- [ ] Clic en play reproduce el audio grabado
- [ ] Audio se escucha claramente
- [ ] Volumen ajustable en el player
- [ ] Barra de progreso funciona correctamente

### 8. Borrar Grabación
- [ ] Clic en botón "Borrar" (🗑️) elimina el audio
- [ ] Vuelve al estado inicial
- [ ] Puede grabar nuevamente
- [ ] Timer se reinicia a 00:00

### 9. Envío del Mensaje de Voz
- [ ] Clic en botón "Enviar" (✓) inicia el proceso
- [ ] Modal muestra "📤 Subiendo mensaje de voz..."
- [ ] Luego muestra "🔍 Analizando mensaje de voz..."
- [ ] Backend recibe el archivo WebM
- [ ] Análisis de seguridad se ejecuta
- [ ] Si aprobado: muestra "✅ Mensaje de voz enviado"
- [ ] Modal se cierra automáticamente

### 10. Visualización en el Chat
- [ ] Mensaje aparece en la lista de mensajes
- [ ] Muestra "🎤 Mensaje de voz" como texto
- [ ] Player de audio inline visible
- [ ] Player tiene diseño consistente con otros archivos
- [ ] Audio es reproducible desde el player
- [ ] Tiempo de duración visible (si aplica)

### 11. Análisis de Seguridad
- [ ] Logs del backend muestran inicio del análisis
- [ ] Se ejecutan 8+ algoritmos de detección
- [ ] Cálculo de riskScore visible en logs
- [ ] Severity determinada correctamente
- [ ] Si aprobado: sube a Cloudinary
- [ ] Si rechazado: muestra mensaje de error específico

### 12. Casos de Error
- [ ] **Sin permisos**: Mensaje claro, no crashea
- [ ] **Sin micrófono**: Detecta ausencia, mensaje específico
- [ ] **Archivo muy grande**: Rechaza antes de subir
- [ ] **Análisis rechazado**: Muestra razón y severity
- [ ] **Error de red**: Muestra error de conexión
- [ ] **Error del servidor**: Mensaje genérico pero claro

### 13. Responsive Design
- [ ] Desktop: Modal de 450px, botones grandes
- [ ] Mobile: Modal de 95% ancho, botones compactos
- [ ] Tablet: Tamaño intermedio
- [ ] Timer legible en todos los tamaños
- [ ] Animaciones fluidas en móvil

### 14. Compatibilidad de Navegadores
- [ ] **Chrome**: WebM nativo, funciona perfecto
- [ ] **Firefox**: WebM nativo, funciona perfecto
- [ ] **Safari**: Fallback a MP4, funciona
- [ ] **Edge**: WebM nativo, funciona perfecto
- [ ] **Opera**: WebM nativo, funciona perfecto

### 15. Performance
- [ ] Grabación no causa lag en la interfaz
- [ ] Timer actualiza sin retrasos
- [ ] Análisis completa en <3 segundos para 1MB
- [ ] Upload progresa sin bloquear UI
- [ ] Reproducción fluida sin stuttering

### 16. Limpieza de Recursos
- [ ] MediaRecorder se detiene correctamente
- [ ] Streams de audio se cierran
- [ ] Blobs se liberan después de enviar
- [ ] URLs locales se revocan
- [ ] No hay memory leaks

### 17. Integración con Otras Funciones
- [ ] Puede responder a mensaje con voz
- [ ] Funciona en chat general
- [ ] Funciona en salas con PIN
- [ ] No interfiere con emoji picker
- [ ] No interfiere con menú de adjuntos
- [ ] Puede enviar texto + voz en secuencia

### 18. Estilos y Animaciones
- [ ] Todos los colores coinciden con el diseño
- [ ] Gradientes se ven correctos
- [ ] Sombras aplicadas correctamente
- [ ] Transiciones suaves (0.3s ease)
- [ ] Hover states funcionan
- [ ] Active states (clic) funcionan

### 19. Logs y Debugging
- [ ] Console.log muestra "🎤 Enviando mensaje de voz..."
- [ ] Backend logs muestran análisis detallado
- [ ] AuditLog registra el evento
- [ ] Errores se logean con detalles
- [ ] Success muestra "✅ Mensaje de voz enviado"

### 20. Seguridad Final
- [ ] Solo audio/webm, audio/mp4, audio/ogg aceptados
- [ ] Archivos ejecutables bloqueados
- [ ] Límite de 10MB respetado
- [ ] Rate limiting funciona
- [ ] Metadata sanitizada
- [ ] Cloudinary solo recibe archivos aprobados

## 📝 Notas de Prueba

### Grabar Mensaje de Prueba:
1. Hacer clic en el botón de micrófono
2. Permitir acceso
3. Decir: "Esto es una prueba de mensaje de voz"
4. Detener después de 3 segundos
5. Escuchar preview
6. Enviar

### Verificar en Backend:
```bash
# Ver logs del análisis
tail -f backend.log | grep "voice"

# Ver AuditLog en MongoDB
db.auditlogs.find({ action: 'FILE_UPLOADED' }).sort({ timestamp: -1 }).limit(1)
```

### Verificar en Frontend:
```javascript
// En la consola del navegador
console.log('MediaRecorder support:', !!window.MediaRecorder);
console.log('getUserMedia support:', !!navigator.mediaDevices.getUserMedia);
```

## 🎯 Criterios de Éxito

✅ **PASS**: Si 18/20 o más items están marcados
⚠️ **WARN**: Si 15-17 items están marcados
❌ **FAIL**: Si menos de 15 items están marcados

## 🐛 Problemas Comunes y Soluciones

### Problema: No se solicitan permisos
**Solución**: Verificar que el sitio use HTTPS (o localhost)

### Problema: MediaRecorder no disponible
**Solución**: Actualizar navegador o usar Chrome/Firefox

### Problema: Audio no se escucha
**Solución**: Verificar volumen del sistema y del player

### Problema: Error al subir
**Solución**: Verificar que backend acepte audio/webm en allowedTypes

### Problema: Análisis rechaza archivo normal
**Solución**: Ajustar umbrales de entropy en steganographyDetector.js

---

**Fecha de última actualización**: $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Versión**: 1.0.0
**Estado**: ✅ Listo para pruebas
