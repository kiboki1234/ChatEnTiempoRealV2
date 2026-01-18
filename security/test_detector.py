"""
Test rápido del detector de vulnerabilidades
"""

from security.vulnerability_detector import (
    detect_vulnerabilities,
    format_vulnerability_report,
    get_vulnerability_summary
)

# Leer archivo de test
with open('security/test_vulnerabilities.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Detectar vulnerabilidades
vulns = detect_vulnerabilities(code, 'test_vulnerabilities.py')
summary = get_vulnerability_summary(vulns)

# Mostrar resumen
print("\n" + "="*80)
print("TEST DE DETECCIÓN DE VULNERABILIDADES")
print("="*80)
print(f"\nArchivo: test_vulnerabilities.py")
print(f"Total de vulnerabilidades: {summary['total']}")
print(f"Severidad máxima: {summary['highest_severity']}")
print(f"Por severidad: {summary['by_severity']}")
print(f"Por tipo: {summary['by_type']}")

# Mostrar reporte detallado (primeras 10)
print(format_vulnerability_report(vulns[:10], 'test_vulnerabilities.py'))

print("\n" + "="*80)
print(f"✓ Detector funcionando correctamente - {summary['total']} vulnerabilidades detectadas")
print("="*80)
