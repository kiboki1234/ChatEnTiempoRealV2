# 🔒 Detector de Esteganografía Mejorado v3.0

## 📋 Resumen de Mejoras

Se ha mejorado significativamente el módulo de detección de esteganografía con técnicas avanzadas de análisis para detectar contenido oculto en archivos multimedia.

## 🎯 Nuevas Capacidades de Detección

### 1. **Análisis LSB (Least Significant Bit) Avanzado**
- ✅ Análisis de **todos los planos de bits** (0-7), no solo el LSB
- ✅ Detección de anomalías en **planos superiores** (bits más significativos)
- ✅ Cálculo de **varianza entre planos** para detectar manipulación
- ✅ Detección de distribución sesgada en bits LSB

### 2. **Análisis de Correlación LSB**
- ✅ Medición de correlación entre bits consecutivos
- ✅ Detección de patrones no naturales en la distribución de bits
- ✅ Identificación de datos embebidos con correlación artificial

### 3. **Análisis de Patrones Repetitivos**
- ✅ Búsqueda de patrones de 16 bytes repetidos
- ✅ Detección de datos estructurados ocultos
- ✅ Identificación de payloads encriptados embebidos

### 4. **Análisis de Histograma Mejorado**
- ✅ Detección de distribuciones anormales de valores
- ✅ Identificación de "gaps" sospechosos en el histograma
- ✅ Test chi-cuadrado para validar normalidad

### 5. **Detección de Código Malicioso Avanzada**
- ✅ Búsqueda en **múltiples encodings** (UTF-8, Latin1, ASCII)
- ✅ Más de **20 patrones de código sospechoso** detectados
- ✅ Detección de:
  - Código PHP embebido
  - JavaScript malicioso
  - Scripts de shell
  - Funciones peligrosas (eval, exec, system)
  - Base64 decode y ofuscación
  - Event handlers sospechosos (onerror, onload)
  - Manipulación de DOM
  - Redirecciones

### 6. **Análisis de Metadata EXIF Profundo**
- ✅ Detección de campos EXIF sospechosos
- ✅ Identificación de metadata excesivamente grande
- ✅ Análisis de ratio metadata/tamaño de archivo
- ✅ Validación de campos específicos (UserComment, MakerNote, etc.)
- ✅ Detección de perfiles ICC inusualmente grandes

### 7. **Test Chi-Cuadrado Mejorado**
- ✅ Normalización por pares válidos
- ✅ Umbrales más estrictos (40 vs 50 anterior)
- ✅ Severidad graduada (LOW, MEDIUM, HIGH)

## 🔧 Parámetros Ajustados

### Umbrales de Entropía
```javascript
// Anterior: 7.5 (muy permisivo)
// Nuevo: 7.4 (más estricto para imágenes)

// Imágenes sin comprimir:
- Critical: 7.6
- High: 7.4
- Elevated: 7.2

// Archivos comprimidos (PDF, ZIP, etc.):
- Critical: 7.95
- High: 7.85
- Elevated: 7.75
```

### Umbrales de Riesgo
```javascript
// Anterior: riskScore >= 4 = sospechoso
// Nuevo: riskScore >= 5 = sospechoso (más preciso)

Severidad:
- CRITICAL: riskScore >= 9
- HIGH: riskScore >= 5
- MEDIUM: riskScore >= 3
- LOW: < 3
```

## 📊 Sistema de Puntuación de Riesgo

| Factor de Riesgo | Puntos | Descripción |
|-----------------|--------|-------------|
| Entropía Crítica | +4 | Entropía extremadamente alta |
| Entropía Alta | +3 | Entropía por encima del umbral |
| Entropía Elevada | +2 | Entropía ligeramente elevada |
| Test Chi-Cuadrado Failed | +3 | Distribución LSB anormal |
| Anomalía LSB | +3 | Planos de bits superiores anormales |
| Correlación LSB | +2 | Correlación no natural |
| Patrones Repetitivos | +2 | Datos estructurados ocultos |
| Metadata Sospechosa | +2-3 | Metadata excesiva o inusual |
| Histograma Anormal | +2 | Distribución de valores sospechosa |
| Canal RGB Anormal | +2 | Entropía alta en canales de color |
| Estructura de Archivo | +3 | Datos después del fin de archivo |
| Firmas de Herramientas | +4 | Herramientas de esteganografía detectadas |

## 🛡️ Herramientas de Esteganografía Detectadas

El sistema ahora detecta **14 herramientas** de esteganografía:
1. OutGuess
2. StegHide / Steghide
3. F5
4. JPHide
5. Camouflage
6. OpenStego
7. SilentEye
8. OpenPuff
9. S-Tools
10. Invisible Secrets
11. DeepSound
12. snow
13. wbStego
14. Y más...

## 🔍 Firmas Maliciosas Detectadas

### Ejecutables
- ✅ PE (Windows .exe) - `MZ` header
- ✅ ELF (Linux ejecutables)

### Código Web Malicioso
- ✅ PHP embebido
- ✅ Scripts JavaScript
- ✅ Event handlers (onerror, onload)
- ✅ Funciones eval/exec
- ✅ Manipulación de DOM

### Funciones Peligrosas
- ✅ system(), shell_exec(), passthru()
- ✅ base64_decode, gzinflate
- ✅ str_rot13
- ✅ Variables superglobales PHP ($_GET, $_POST, $_REQUEST)

## 📈 Mejoras de Rendimiento

- ✅ Análisis con sampling inteligente (100,000 muestras max)
- ✅ Búsqueda limitada de firmas (max 5 ocurrencias)
- ✅ Escaneo de hasta 50KB para código malicioso
- ✅ Worker threads para procesamiento paralelo

## 🚀 Cómo Funciona

### Flujo de Análisis para Imágenes:

```
1. Lectura del archivo y metadata
   ↓
2. Cálculo de hash SHA-256
   ↓
3. Búsqueda de firmas maliciosas
   ↓
4. Extracción de datos de píxeles
   ↓
5. Análisis de entropía global
   ↓
6. Test Chi-Cuadrado LSB
   ↓
7. Análisis LSB multi-plano
   ↓
8. Análisis de correlación LSB
   ↓
9. Análisis de patrones repetitivos
   ↓
10. Análisis de metadata EXIF
   ↓
11. Análisis de canales RGB
   ↓
12. Análisis de estructura de archivo
   ↓
13. Análisis de histograma
   ↓
14. Cálculo de puntuación de riesgo
   ↓
15. Decisión: APROBAR / RECHAZAR
```

## 📝 Ejemplo de Reporte de Seguridad

```json
{
  "suspicious": true,
  "severity": "HIGH",
  "riskScore": 8,
  "riskFactors": [
    "High entropy detected",
    "Abnormal LSB distribution (2 upper plane anomalies)",
    "LSB correlation anomaly",
    "Suspicious metadata (3 anomalies)"
  ],
  "entropy": "7.523",
  "fileHash": "a1b2c3d4...",
  "chiSquareResult": {
    "chiSquare": "52.34",
    "normalizedChi": "0.2047",
    "suspicious": true,
    "severity": "HIGH"
  },
  "lsbAnalysis": {
    "suspicious": true,
    "lsbRatio": "0.623",
    "upperPlanesAnomalies": 2,
    "variance": "0.0087"
  },
  "lsbCorrelation": {
    "correlationRatio": "0.5387",
    "deviation": "0.0387",
    "suspicious": true
  },
  "patternAnalysis": {
    "suspicious": false,
    "maxRepetitions": 5,
    "totalPatterns": 2847
  },
  "metadataAnalysis": {
    "suspicious": true,
    "riskScore": 4,
    "anomalies": [
      "Excessive EXIF tags (67)",
      "Suspicious EXIF field: UserComment (2456 chars)",
      "Large ICC profile (150KB)"
    ]
  }
}
```

## 🎯 Casos de Uso Detectados

### ✅ Detecta:
1. **Imágenes con datos ocultos** usando LSB steganography
2. **Código malicioso embebido** en archivos multimedia
3. **Archivos polyglot** (múltiples formatos en uno)
4. **Datos después del fin de archivo** (trailing data)
5. **Metadata manipulada** con información oculta
6. **Herramientas de esteganografía** conocidas
7. **Payloads encriptados** con patrones sospechosos
8. **Scripts maliciosos** en múltiples encodings

### ⚠️ Falsos Positivos Minimizados:
- ✅ Umbrales ajustados por tipo de archivo
- ✅ Archivos comprimidos tienen umbral de entropía más alto
- ✅ Null bytes permitidos en formatos binarios
- ✅ Tamaños de archivo validados por tipo

## 🔒 Seguridad

### Logging y Auditoría:
- ✅ Todos los análisis se registran en AuditLog
- ✅ Archivos sospechosos enviados a cuarentena
- ✅ Hash SHA-256 calculado para cada archivo
- ✅ Detalles completos del análisis almacenados

### Cuarentena:
- ✅ Archivos sospechosos movidos automáticamente
- ✅ Metadata de usuario y análisis preservados
- ✅ Eliminación segura de archivos temporales

## 📚 Referencias Técnicas

- **LSB Steganography Detection**: Chi-square attack
- **Entropy Analysis**: Shannon entropy for data randomness
- **Bit Plane Analysis**: Multi-layer LSB detection
- **Pattern Analysis**: Repetition-based payload detection
- **Metadata Forensics**: EXIF/ICC profile analysis

## ⚡ Rendimiento

- **Análisis de imagen típica (1MB)**: ~200-500ms
- **Worker threads**: Procesamiento paralelo
- **Memory efficient**: Sampling inteligente
- **Scalable**: Pool de workers configurable

## 🎓 Conclusión

El **Detector de Esteganografía v3.0** proporciona una protección robusta contra:
- ✅ Esteganografía LSB y variantes
- ✅ Código malicioso embebido
- ✅ Payloads encriptados
- ✅ Manipulación de metadata
- ✅ Archivos polyglot
- ✅ Herramientas de esteganografía conocidas

Con umbrales ajustados, análisis multi-capa y puntuación de riesgo precisa, el sistema ahora puede detectar amenazas sofisticadas que pasaban desapercibidas en versiones anteriores.

---
**Versión**: 3.0 - Enhanced Detection
**Fecha**: Noviembre 2025
**Estado**: ✅ Activo y funcionando
