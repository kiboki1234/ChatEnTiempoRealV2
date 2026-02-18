"""
Verificación de la implementación del sistema de detección de vulnerabilidades
"""

import os
from pathlib import Path

def check_file_exists(filepath, description):
    """Verifica si un archivo existe"""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}")
    if exists:
        size = os.path.getsize(filepath)
        print(f"   Tamaño: {size:,} bytes")
    return exists

def main():
    print("="*80)
    print("VERIFICACIÓN DE IMPLEMENTACIÓN")
    print("Sistema de Detección de Vulnerabilidades")
    print("="*80)
    
    project_root = Path(__file__).parent.parent
    all_ok = True
    
    print("\n📦 COMPONENTES PRINCIPALES:")
    print("-" * 80)
    
    files_to_check = [
        (project_root / "security" / "vulnerability_detector.py", "Detector de vulnerabilidades"),
        (project_root / "security" / "demo_vulnerability_detection.py", "Script de demostración"),
        (project_root / "security" / "test_detector.py", "Script de test"),
        (project_root / "security" / "test_vulnerabilities.py", "Archivo con vulnerabilidades de ejemplo"),
        (project_root / "security" / "test_secure_code.py", "Archivo con código seguro"),
        (project_root / ".github" / "scripts" / "integrated_security_scanner.py", "Escáner integrado para CI/CD"),
    ]
    
    for filepath, description in files_to_check:
        if not check_file_exists(filepath, description):
            all_ok = False
    
    print("\n📚 DOCUMENTACIÓN:")
    print("-" * 80)
    
    docs = [
        (project_root / "security" / "README.md", "README del sistema"),
        (project_root / "security" / "IMPLEMENTACION_COMPLETA.md", "Documentación de implementación"),
        (project_root / "security" / "EJEMPLO_REPORTE_PR.md", "Ejemplo de reporte en PR"),
    ]
    
    for filepath, description in docs:
        if not check_file_exists(filepath, description):
            all_ok = False
    
    print("\n🔧 INTEGRACIÓN CI/CD:")
    print("-" * 80)
    
    workflow_file = project_root / ".github" / "workflows" / "frontend-ci.yml"
    if check_file_exists(workflow_file, "Workflow de CI/CD"):
        with open(workflow_file, 'r', encoding='utf-8') as f:
            content = f.read()
            checks = [
                ("integrated_security_scanner" in content, "Referencia al escáner integrado"),
                ("vulnerability_count" in content, "Conteo de vulnerabilidades"),
                ("max_severity" in content, "Severidad máxima"),
                ("by_severity" in content, "Agrupación por severidad"),
            ]
            
            for check, description in checks:
                status = "✅" if check else "❌"
                print(f"{status} {description}")
                if not check:
                    all_ok = False
    else:
        all_ok = False
    
    print("\n🧪 FUNCIONALIDAD:")
    print("-" * 80)
    
    try:
        # Verificar que el módulo se puede importar
        import sys
        sys.path.insert(0, str(project_root))
        
        from security.vulnerability_detector import (
            detect_vulnerabilities,
            get_vulnerability_summary,
            format_vulnerability_report,
            Vulnerability,
            Severity,
            VulnerabilityType
        )
        print("✅ Módulo vulnerability_detector importable")
        
        # Test rápido
        test_code = 'eval(user_input)'
        vulns = detect_vulnerabilities(test_code, 'test.py')
        
        if len(vulns) > 0:
            print(f"✅ Detector funcional - Detectó {len(vulns)} vulnerabilidad(es)")
            print(f"   Tipo: {vulns[0].type.value}")
            print(f"   Severidad: {vulns[0].severity.value}")
        else:
            print("❌ Detector no detectó vulnerabilidad conocida")
            all_ok = False
            
    except Exception as e:
        print(f"❌ Error al importar o ejecutar detector: {e}")
        all_ok = False
    
    print("\n" + "="*80)
    if all_ok:
        print("✅ VERIFICACIÓN COMPLETA - Sistema implementado correctamente")
        print("="*80)
        print("\n🚀 Próximos pasos:")
        print("  1. Probar: python security/demo_vulnerability_detection.py")
        print("  2. Test: python security/test_detector.py")
        print("  3. Revisar: security/README.md")
        print("  4. Crear PR para activar CI/CD con el nuevo sistema")
    else:
        print("❌ VERIFICACIÓN FALLIDA - Revisar componentes faltantes")
        print("="*80)
    
    print()
    return 0 if all_ok else 1

if __name__ == "__main__":
    exit(main())
