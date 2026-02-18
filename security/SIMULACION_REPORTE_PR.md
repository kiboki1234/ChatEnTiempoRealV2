# Simulación de Reporte en Pull Request

Este es el mensaje exacto que aparecerá en tu PR cuando dev → main si hay vulnerabilidades.

---

## 🔍 Resultado de Revisión de Seguridad Integrada

**Estado:** ❌ VULNERABLE
**Probabilidad de riesgo máxima:** 95.0%
**Archivos analizados:** 5
**Archivos vulnerables:** 2
**Total de vulnerabilidades:** 8

## ❌ MERGE BLOQUEADO - Se requiere corrección de vulnerabilidades

### 📋 Archivos Vulnerables Detectados:

1. 🔴 **backend/controllers/authController.js**
   - **Severidad máxima:** CRITICAL
   - **Vulnerabilidades encontradas:** 5
   - **Probabilidad ML:** 95.0%
   - **Por severidad:** {"CRITICAL": 3, "HIGH": 2}
   - **Por tipo:** {"SQL Injection": 2, "Command Injection": 3}

   **Detalles de vulnerabilidades:**

   1. **SQL Injection** (CRITICAL) - Línea 45
      - Código: `cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)`
      - String formatting en SQL query
      - ✅ Recomendación: Use parametrized queries: cursor.execute(query, (param,))

   2. **SQL Injection** (CRITICAL) - Línea 78
      - Código: `query = f"SELECT * FROM users WHERE email = '{email}'"`
      - F-string en SQL query
      - ✅ Recomendación: Use parametrized queries en lugar de f-strings

   3. **Command Injection** (CRITICAL) - Línea 112
      - Código: `os.system("rm -rf " + temp_path)`
      - Uso de os.system() con posible entrada de usuario
      - ✅ Recomendación: Use subprocess con argumentos separados: subprocess.run([cmd, arg1, arg2])

   4. **Command Injection** (HIGH) - Línea 156
      - Código: `subprocess.run(command, shell=True)`
      - subprocess con shell=True
      - ✅ Recomendación: Use subprocess sin shell=True y con lista de argumentos

   5. **Command Injection** (HIGH) - Línea 201
      - Código: `result = eval(user_input)`
      - Uso de eval() - puede ejecutar código arbitrario
      - ✅ Recomendación: Evite eval(). Use ast.literal_eval() para datos o alternativas seguras


2. 🟠 **frontend/src/components/UserProfile.jsx**
   - **Severidad máxima:** HIGH
   - **Vulnerabilidades encontradas:** 3
   - **Probabilidad ML:** 78.5%
   - **Por severidad:** {"HIGH": 3}
   - **Por tipo:** {"Cross-Site Scripting (XSS)": 3}

   **Detalles de vulnerabilidades:**

   1. **Cross-Site Scripting (XSS)** (HIGH) - Línea 67
      - Código: `element.innerHTML = userBio`
      - Uso de innerHTML - puede permitir XSS
      - ✅ Recomendación: Use textContent o sanitice HTML con DOMPurify

   2. **Cross-Site Scripting (XSS)** (HIGH) - Línea 89
      - Código: `<div dangerouslySetInnerHTML={{__html: userContent}} />`
      - dangerouslySetInnerHTML en React
      - ✅ Recomendación: Sanitice HTML con DOMPurify antes de usar

   3. **Cross-Site Scripting (XSS)** (HIGH) - Línea 134
      - Código: `document.write(message)`
      - Uso de document.write() - puede permitir XSS
      - ✅ Recomendación: Use métodos modernos de DOM manipulation


<details>
<summary>📊 Ver detalles técnicos completos (JSON)</summary>

```json
{
  "status": "VULNERABLE",
  "files_analyzed": 5,
  "vulnerable_files": 2,
  "total_vulnerabilities": 8,
  "max_risk_probability": 0.95,
  "results": [
    {
      "file": "backend/controllers/authController.js",
      "status": "VULNERABLE",
      "vulnerability_count": 5,
      "max_severity": "CRITICAL",
      "by_severity": {
        "CRITICAL": 3,
        "HIGH": 2
      },
      "by_type": {
        "SQL Injection": 2,
        "Command Injection": 3
      },
      "ml_probability": 0.95,
      "nloc": 234,
      "complexity": 12,
      "vulnerabilities": [
        {
          "type": "SQL Injection",
          "severity": "CRITICAL",
          "line": 45,
          "code": "cursor.execute(\"SELECT * FROM users WHERE id = %s\" % user_id)",
          "description": "String formatting en SQL query",
          "recommendation": "Use parametrized queries: cursor.execute(query, (param,))",
          "confidence": 0.95
        },
        {
          "type": "SQL Injection",
          "severity": "CRITICAL",
          "line": 78,
          "code": "query = f\"SELECT * FROM users WHERE email = '{email}'\"",
          "description": "F-string en SQL query",
          "recommendation": "Use parametrized queries en lugar de f-strings",
          "confidence": 0.95
        },
        {
          "type": "Command Injection",
          "severity": "CRITICAL",
          "line": 112,
          "code": "os.system(\"rm -rf \" + temp_path)",
          "description": "Uso de os.system() con posible entrada de usuario",
          "recommendation": "Use subprocess con argumentos separados: subprocess.run([cmd, arg1, arg2])",
          "confidence": 0.85
        },
        {
          "type": "Command Injection",
          "severity": "HIGH",
          "line": 156,
          "code": "subprocess.run(command, shell=True)",
          "description": "subprocess con shell=True",
          "recommendation": "Use subprocess sin shell=True y con lista de argumentos",
          "confidence": 0.9
        },
        {
          "type": "Command Injection",
          "severity": "HIGH",
          "line": 201,
          "code": "result = eval(user_input)",
          "description": "Uso de eval() - puede ejecutar código arbitrario",
          "recommendation": "Evite eval(). Use ast.literal_eval() para datos o alternativas seguras",
          "confidence": 0.95
        }
      ]
    },
    {
      "file": "frontend/src/components/UserProfile.jsx",
      "status": "VULNERABLE",
      "vulnerability_count": 3,
      "max_severity": "HIGH",
      "by_severity": {
        "HIGH": 3
      },
      "by_type": {
        "Cross-Site Scripting (XSS)": 3
      },
      "ml_probability": 0.785,
      "nloc": 178,
      "complexity": 8,
      "vulnerabilities": [
        {
          "type": "Cross-Site Scripting (XSS)",
          "severity": "HIGH",
          "line": 67,
          "code": "element.innerHTML = userBio",
          "description": "Uso de innerHTML - puede permitir XSS",
          "recommendation": "Use textContent o sanitice HTML con DOMPurify",
          "confidence": 0.8
        },
        {
          "type": "Cross-Site Scripting (XSS)",
          "severity": "HIGH",
          "line": 89,
          "code": "<div dangerouslySetInnerHTML={{__html: userContent}} />",
          "description": "dangerouslySetInnerHTML en React",
          "recommendation": "Sanitice HTML con DOMPurify antes de usar",
          "confidence": 0.9
        },
        {
          "type": "Cross-Site Scripting (XSS)",
          "severity": "HIGH",
          "line": 134,
          "code": "document.write(message)",
          "description": "Uso de document.write() - puede permitir XSS",
          "recommendation": "Use métodos modernos de DOM manipulation",
          "confidence": 0.85
        }
      ]
    }
  ]
}
```

</details>

*Modelo de ML: Random Forest | Accuracy: >82%*
