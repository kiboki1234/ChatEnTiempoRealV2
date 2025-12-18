"""
Simulación del reporte que aparecerá en el PR cuando dev → main
Muestra exactamente lo que verás si hay vulnerabilidades
"""

import json
from pathlib import Path

# Simular resultado del escáner
simulated_result = {
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
            "by_severity": {"CRITICAL": 3, "HIGH": 2},
            "by_type": {"SQL Injection": 2, "Command Injection": 3},
            "ml_probability": 0.95,
            "nloc": 234,
            "complexity": 12,
            "vulnerabilities": [
                {
                    "type": "SQL Injection",
                    "severity": "CRITICAL",
                    "line": 45,
                    "code": 'cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)',
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
                    "code": 'os.system("rm -rf " + temp_path)',
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
                    "confidence": 0.90
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
            "by_severity": {"HIGH": 3},
            "by_type": {"Cross-Site Scripting (XSS)": 3},
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
                    "confidence": 0.80
                },
                {
                    "type": "Cross-Site Scripting (XSS)",
                    "severity": "HIGH",
                    "line": 89,
                    "code": "<div dangerouslySetInnerHTML={{__html: userContent}} />",
                    "description": "dangerouslySetInnerHTML en React",
                    "recommendation": "Sanitice HTML con DOMPurify antes de usar",
                    "confidence": 0.90
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

def generate_pr_comment(result):
    """Genera el comentario que aparecerá en el PR"""
    
    total_files = result['files_analyzed']
    total_vulns = result['total_vulnerabilities']
    risk_prob = result['max_risk_probability']
    vulnerable_files = [r for r in result['results'] if r['status'] == 'VULNERABLE']
    
    severity_icons = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🔵',
        'INFO': '⚪'
    }
    
    comment = f"""## 🔍 Resultado de Revisión de Seguridad Integrada

**Estado:** ❌ VULNERABLE
**Probabilidad de riesgo máxima:** {risk_prob * 100:.1f}%
**Archivos analizados:** {total_files}
**Archivos vulnerables:** {len(vulnerable_files)}
**Total de vulnerabilidades:** {total_vulns}

## ❌ MERGE BLOQUEADO - Se requiere corrección de vulnerabilidades

### 📋 Archivos Vulnerables Detectados:

"""
    
    for idx, file_result in enumerate(vulnerable_files, 1):
        icon = severity_icons.get(file_result['max_severity'], '⚫')
        
        comment += f"{idx}. {icon} **{file_result['file']}**\n"
        comment += f"   - **Severidad máxima:** {file_result['max_severity']}\n"
        comment += f"   - **Vulnerabilidades encontradas:** {file_result['vulnerability_count']}\n"
        comment += f"   - **Probabilidad ML:** {file_result['ml_probability'] * 100:.1f}%\n"
        comment += f"   - **Por severidad:** {json.dumps(file_result['by_severity'])}\n"
        comment += f"   - **Por tipo:** {json.dumps(file_result['by_type'])}\n"
        comment += "\n   **Detalles de vulnerabilidades:**\n\n"
        
        for vidx, vuln in enumerate(file_result['vulnerabilities'], 1):
            comment += f"   {vidx}. **{vuln['type']}** ({vuln['severity']}) - Línea {vuln['line']}\n"
            comment += f"      - Código: `{vuln['code'][:80]}{'...' if len(vuln['code']) > 80 else ''}`\n"
            comment += f"      - {vuln['description']}\n"
            comment += f"      - ✅ Recomendación: {vuln['recommendation']}\n\n"
        
        comment += "\n"
    
    comment += """<details>
<summary>📊 Ver detalles técnicos completos (JSON)</summary>

```json
"""
    comment += json.dumps(result, indent=2, ensure_ascii=False)
    comment += """
```

</details>

*Modelo de ML: Random Forest | Accuracy: >82%*
"""
    
    return comment


def main():
    print("="*80)
    print("SIMULACIÓN DE REPORTE EN PULL REQUEST")
    print("Esto es lo que verás cuando hagas merge de dev → main")
    print("="*80)
    print()
    
    # Generar el comentario
    comment = generate_pr_comment(simulated_result)
    
    # Mostrar el comentario
    print(comment)
    
    print("\n" + "="*80)
    print("ESTADO DEL PULL REQUEST:")
    print("="*80)
    print()
    print("❌ Este PR está BLOQUEADO y no puede ser mergeado")
    print()
    print("Labels aplicados:")
    print("  🏷️  fixing-required")
    print("  🏷️  security-review-required")
    print("  🏷️  vulnerability-critical")
    print()
    print("Acciones automáticas:")
    print("  ✅ Comentario con detalles agregado al PR")
    print("  ✅ Labels aplicados")
    print("  ✅ Merge bloqueado")
    print("  ✅ Notificación enviada (si Telegram está configurado)")
    print("  ✅ Issue automático creado")
    print()
    print("Para desbloquear el PR:")
    print("  1. Corrige las vulnerabilidades según las recomendaciones")
    print("  2. Haz commit y push de los cambios")
    print("  3. El escáner se ejecutará automáticamente de nuevo")
    print("  4. Si el código está seguro, el merge será aprobado")
    print()
    print("="*80)
    
    # Guardar el comentario en un archivo
    output_file = Path(__file__).parent / "SIMULACION_REPORTE_PR.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Simulación de Reporte en Pull Request\n\n")
        f.write("Este es el mensaje exacto que aparecerá en tu PR cuando dev → main si hay vulnerabilidades.\n\n")
        f.write("---\n\n")
        f.write(comment)
    
    print(f"\n✅ Reporte guardado en: {output_file}")
    print()


if __name__ == "__main__":
    main()
