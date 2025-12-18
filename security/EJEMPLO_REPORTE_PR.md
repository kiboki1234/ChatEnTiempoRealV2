# 🔍 Ejemplo de Reporte en Pull Request

Este es un ejemplo de cómo se vería el reporte de seguridad en un Pull Request real:

---

## 🔍 Resultado de Revisión de Seguridad Integrada

**Estado:** ❌ VULNERABLE  
**Probabilidad de riesgo máxima:** 95.0%  
**Archivos analizados:** 15  
**Archivos vulnerables:** 3  
**Total de vulnerabilidades:** 12

## ❌ MERGE BLOQUEADO - Se requiere corrección de vulnerabilidades

### 📋 Archivos Vulnerables Detectados:

#### 1. 🔴 **backend/auth/userAuth.py**
   - **Severidad máxima:** CRITICAL
   - **Vulnerabilidades encontradas:** 5
   - **Probabilidad ML:** 95.0%
   - **Por severidad:** {"CRITICAL": 3, "HIGH": 2}
   - **Por tipo:** {"SQL Injection": 2, "Command Injection": 2, "Hardcoded Secret": 1}
   
   **Detalles de vulnerabilidades:**
   
   1. **SQL Injection** (CRITICAL) - Línea 45
      - Código: `cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)`
      - String formatting en SQL query
      - ✅ **Recomendación:** Use parametrized queries: `cursor.execute(query, (param,))`
   
   2. **SQL Injection** (CRITICAL) - Línea 78
      - Código: `query = f"SELECT * FROM users WHERE email = '{email}'"`
      - F-string en SQL query
      - ✅ **Recomendación:** Use parametrized queries en lugar de f-strings
   
   3. **Command Injection** (CRITICAL) - Línea 112
      - Código: `os.system("rm -rf " + temp_path)`
      - Uso de os.system() con posible entrada de usuario
      - ✅ **Recomendación:** Use subprocess con argumentos separados: `subprocess.run([cmd, arg1, arg2])`
   
   4. **Command Injection** (HIGH) - Línea 156
      - Código: `subprocess.run(command, shell=True)`
      - subprocess con shell=True
      - ✅ **Recomendación:** Use subprocess sin shell=True y con lista de argumentos
   
   5. **Hardcoded Secret** (HIGH) - Línea 23
      - Código: `API_SECRET = "sk-1234567890abcdefghijklmnop"`
      - Posible secreto hardcodeado en código
      - ✅ **Recomendación:** Use variables de entorno o gestores de secretos

---

#### 2. 🟠 **frontend/src/components/UserProfile.jsx**
   - **Severidad máxima:** HIGH
   - **Vulnerabilidades encontradas:** 4
   - **Probabilidad ML:** 78.5%
   - **Por severidad:** {"HIGH": 4}
   - **Por tipo:** {"Cross-Site Scripting (XSS)": 3, "Hardcoded Secret": 1}
   
   **Detalles de vulnerabilidades:**
   
   1. **Cross-Site Scripting** (HIGH) - Línea 67
      - Código: `element.innerHTML = userBio`
      - Uso de innerHTML - puede permitir XSS
      - ✅ **Recomendación:** Use textContent o sanitice HTML con DOMPurify
   
   2. **Cross-Site Scripting** (HIGH) - Línea 89
      - Código: `<div dangerouslySetInnerHTML={{__html: userContent}} />`
      - dangerouslySetInnerHTML en React
      - ✅ **Recomendación:** Sanitice HTML con DOMPurify antes de usar
   
   3. **Cross-Site Scripting** (HIGH) - Línea 134
      - Código: `document.write(message)`
      - Uso de document.write() - puede permitir XSS
      - ✅ **Recomendación:** Use métodos modernos de DOM manipulation
   
   4. **Hardcoded Secret** (HIGH) - Línea 12
      - Código: `const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
      - Posible secreto hardcodeado en código
      - ✅ **Recomendación:** Use variables de entorno o gestores de secretos

---

#### 3. 🟡 **backend/utils/crypto.py**
   - **Severidad máxima:** MEDIUM
   - **Vulnerabilidades encontradas:** 3
   - **Probabilidad ML:** 45.2%
   - **Por severidad:** {"MEDIUM": 3}
   - **Por tipo:** {"Weak Cryptography": 2, "Insecure Random": 1}
   
   **Detalles de vulnerabilidades:**
   
   1. **Weak Cryptography** (MEDIUM) - Línea 34
      - Código: `password_hash = hashlib.md5(password.encode()).hexdigest()`
      - Uso de algoritmo de hash débil (MD5/SHA1)
      - ✅ **Recomendación:** Use SHA-256 o superior: `hashlib.sha256()`
   
   2. **Weak Cryptography** (MEDIUM) - Línea 56
      - Código: `token_hash = hashlib.sha1(token.encode()).hexdigest()`
      - Uso de algoritmo de hash débil (MD5/SHA1)
      - ✅ **Recomendación:** Use SHA-256 o superior: `hashlib.sha256()`
   
   3. **Insecure Random** (MEDIUM) - Línea 78
      - Código: `otp = str(random.randint(100000, 999999))`
      - Uso de generador de números aleatorios no criptográfico
      - ✅ **Recomendación:** Use `secrets.token_bytes()` o `secrets.SystemRandom()` para seguridad

---

<details>
<summary>📊 Ver detalles técnicos completos (JSON)</summary>

```json
{
  "status": "VULNERABLE",
  "files_analyzed": 15,
  "vulnerable_files": 3,
  "total_vulnerabilities": 12,
  "max_risk_probability": 0.95,
  "results": [
    {
      "file": "backend/auth/userAuth.py",
      "status": "VULNERABLE",
      "vulnerability_count": 5,
      "max_severity": "CRITICAL",
      "by_severity": {
        "CRITICAL": 3,
        "HIGH": 2
      },
      "by_type": {
        "SQL Injection": 2,
        "Command Injection": 2,
        "Hardcoded Secret": 1
      },
      "ml_probability": 0.95,
      "nloc": 234,
      "complexity": 12
    },
    {
      "file": "frontend/src/components/UserProfile.jsx",
      "status": "VULNERABLE",
      "vulnerability_count": 4,
      "max_severity": "HIGH",
      "by_severity": {
        "HIGH": 4
      },
      "by_type": {
        "Cross-Site Scripting (XSS)": 3,
        "Hardcoded Secret": 1
      },
      "ml_probability": 0.785,
      "nloc": 178,
      "complexity": 8
    },
    {
      "file": "backend/utils/crypto.py",
      "status": "VULNERABLE",
      "vulnerability_count": 3,
      "max_severity": "MEDIUM",
      "by_severity": {
        "MEDIUM": 3
      },
      "by_type": {
        "Weak Cryptography": 2,
        "Insecure Random": 1
      },
      "ml_probability": 0.452,
      "nloc": 89,
      "complexity": 4
    }
  ]
}
```

</details>

---

### 📈 Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| 🔴 CRITICAL | 3 |
| 🟠 HIGH | 6 |
| 🟡 MEDIUM | 3 |
| 🔵 LOW | 0 |
| ⚪ INFO | 0 |

### 🔒 Tipos de Vulnerabilidades Encontradas

- **SQL Injection**: 2 casos
- **Cross-Site Scripting (XSS)**: 3 casos
- **Command Injection**: 3 casos
- **Weak Cryptography**: 2 casos
- **Hardcoded Secret**: 2 casos
- **Insecure Random**: 1 caso

---

## 🛠️ Acciones Requeridas

1. ✅ Revisar cada archivo listado
2. ✅ Corregir las vulnerabilidades según las recomendaciones
3. ✅ Reemplazar código vulnerable con alternativas seguras
4. ✅ Mover secretos a variables de entorno
5. ✅ Volver a ejecutar el pipeline de CI/CD

## 📚 Recursos de Referencia

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Guía de Seguridad Python](https://python.readthedocs.io/en/stable/library/security_warnings.html)
- [Documentación del Proyecto - security/README.md](security/README.md)

---

*🤖 Modelo de ML: Random Forest | Accuracy: >82%*  
*🔍 Detector de Patrones: 16+ tipos de vulnerabilidades*  
*✨ Sistema Integrado de Seguridad v2.0*

---

## ⚠️ Este PR está bloqueado hasta que se corrijan las vulnerabilidades

**Labels aplicados:** `security-review-required` `fixing-required` `vulnerability-critical`
