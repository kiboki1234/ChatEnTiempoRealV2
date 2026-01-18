# 🔒 Sistema de Detección de Vulnerabilidades

Sistema integrado de análisis de seguridad que combina Machine Learning con detección detallada de vulnerabilidades.

## 📋 Componentes

### 1. Detector de Vulnerabilidades (`vulnerability_detector.py`)

Detector completo que identifica vulnerabilidades específicas con:
- **Línea exacta** donde se encuentra el problema
- **Nivel de severidad** (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- **Tipo de vulnerabilidad** (SQL Injection, XSS, Command Injection, etc.)
- **Descripción detallada** del problema
- **Recomendaciones** para corregirlo
- **Nivel de confianza** de la detección

#### Vulnerabilidades Detectadas

**Python:**
- SQL Injection (string formatting, f-strings, concatenación)
- Command Injection (eval, exec, os.system, subprocess)
- Path Traversal
- Weak Cryptography (MD5, SHA1)
- Insecure Random Numbers
- Unsafe Deserialization (pickle)
- Hardcoded Secrets

**JavaScript/TypeScript:**
- XSS (innerHTML, document.write, dangerouslySetInnerHTML)
- Command Injection (eval, child_process)
- Open Redirect
- Hardcoded Secrets

### 2. Escáner Integrado (`.github/scripts/integrated_security_scanner.py`)

Combina:
- **Modelo ML** (Random Forest, >82% accuracy)
- **Detección de patrones** específicos
- **Análisis de complejidad** (lizard)
- **Reportes detallados** en JSON

### 3. Demo de Detección (`demo_vulnerability_detection.py`)

Script para probar el detector localmente:

```bash
python security/demo_vulnerability_detection.py
```

## 🚀 Uso

### Análisis Local

```python
from security.vulnerability_detector import (
    detect_vulnerabilities,
    format_vulnerability_report,
    get_vulnerability_summary
)

# Analizar código
code = """
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)
"""

vulnerabilities = detect_vulnerabilities(code, "test.py")
print(format_vulnerability_report(vulnerabilities))
```

### En CI/CD

El sistema se ejecuta automáticamente en:
- Pull Requests hacia `main` o `test`
- Push a `main`, `develop` o `test`

Workflow: `.github/workflows/frontend-ci.yml`

## 📊 Formato de Reporte

### Resumen en PR

```
🔍 Resultado de Revisión de Seguridad Integrada

Estado: ❌ VULNERABLE
Probabilidad de riesgo máxima: 95.0%
Archivos analizados: 5
Archivos vulnerables: 2
Total de vulnerabilidades: 8

📋 Archivos Vulnerables Detectados:

1. 🔴 backend/vulnerable_test.py
   - Severidad máxima: CRITICAL
   - Vulnerabilidades encontradas: 5
   - Probabilidad ML: 95.0%
   - Por severidad: {"CRITICAL": 3, "HIGH": 2}
   - Por tipo: {"SQL Injection": 2, "Command Injection": 3}
   
   Detalles de vulnerabilidades:
   1. SQL Injection (CRITICAL) - Línea 45
      - Código: cursor.execute("SELECT * FROM users WHERE id = %s...
      - String formatting en SQL query
      - ✅ Recomendación: Use parametrized queries
```

### JSON Detallado

```json
{
  "file": "backend/server.js",
  "status": "VULNERABLE",
  "vulnerability_count": 3,
  "max_severity": "HIGH",
  "by_severity": {
    "HIGH": 2,
    "MEDIUM": 1
  },
  "by_type": {
    "Cross-Site Scripting": 2,
    "Hardcoded Secret": 1
  },
  "ml_probability": 0.75,
  "vulnerabilities": [
    {
      "type": "Cross-Site Scripting",
      "severity": "HIGH",
      "line": 123,
      "code": "element.innerHTML = userInput;",
      "description": "Uso de innerHTML - puede permitir XSS",
      "recommendation": "Use textContent o sanitice HTML con DOMPurify",
      "confidence": 0.8
    }
  ]
}
```

## 🎯 Severidades

- 🔴 **CRITICAL**: Vulnerabilidades que permiten ejecución de código o acceso completo
- 🟠 **HIGH**: Vulnerabilidades graves que pueden ser explotadas
- 🟡 **MEDIUM**: Vulnerabilidades que requieren condiciones específicas
- 🔵 **LOW**: Problemas de seguridad menores
- ⚪ **INFO**: Información sobre mejores prácticas

## 🔧 Configuración

### Variables de Entorno

```yaml
env:
  MODEL_PATH: './models/modelo_seguridad_final2.pkl'
  TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
  TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

### Umbrales de Bloqueo

El merge se bloquea si:
- Se detecta al menos una vulnerabilidad
- La probabilidad ML > 0.5
- Hay vulnerabilidades de severidad CRITICAL o HIGH

## 📈 Mejoras Futuras

- [ ] Soporte para más lenguajes (Java, C++, Go)
- [ ] Integración con SAST tools (SonarQube, Snyk)
- [ ] Auto-fix para vulnerabilidades comunes
- [ ] Dashboard de métricas de seguridad
- [ ] Análisis de dependencias vulnerables
- [ ] Detección de secretos con regex avanzados

## 🤝 Contribuir

Para añadir nuevos patrones de detección:

1. Editar `vulnerability_detector.py`
2. Añadir pattern en `PYTHON_PATTERNS` o `JAVASCRIPT_PATTERNS`
3. Especificar tipo, severidad, descripción y recomendación
4. Probar con `demo_vulnerability_detection.py`

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [NIST Vulnerability Database](https://nvd.nist.gov/)

## 📄 Licencia

Parte del proyecto ChatEnTiempoRealV2
