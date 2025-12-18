"""
Escáner de Seguridad Integrado
Combina modelo ML con detección detallada de vulnerabilidades
"""

import sys
import json
import os
import re
from pathlib import Path
from enum import Enum
from typing import List, Dict, Any
from dataclasses import dataclass

# Importar detector de vulnerabilidades
try:
    import joblib
    import pandas as pd
    import lizard
    HAS_ML = True
except ImportError:
    HAS_ML = False


class Severity(Enum):
    """Niveles de severidad"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class VulnerabilityType(Enum):
    """Tipos de vulnerabilidades"""
    SQL_INJECTION = "SQL Injection"
    XSS = "Cross-Site Scripting"
    COMMAND_INJECTION = "Command Injection"
    PATH_TRAVERSAL = "Path Traversal"
    WEAK_CRYPTO = "Weak Cryptography"
    HARDCODED_SECRET = "Hardcoded Secret"
    UNSAFE_DESERIALIZATION = "Unsafe Deserialization"
    INSECURE_RANDOM = "Insecure Random"


@dataclass
class Vulnerability:
    """Vulnerabilidad detectada"""
    type: VulnerabilityType
    severity: Severity
    line_number: int
    code_snippet: str
    description: str
    recommendation: str
    confidence: float = 1.0


class VulnerabilityPatterns:
    """Patrones de detección"""
    
    PYTHON_PATTERNS = [
        {
            'pattern': r'(cursor\.execute|execute)\s*\(\s*["\'].*%s.*["\'].*%',
            'type': VulnerabilityType.SQL_INJECTION,
            'severity': Severity.CRITICAL,
            'description': 'String formatting en SQL query',
            'recommendation': 'Use parametrized queries',
            'confidence': 0.95
        },
        {
            'pattern': r'(cursor\.execute|execute)\s*\(\s*f["\']',
            'type': VulnerabilityType.SQL_INJECTION,
            'severity': Severity.CRITICAL,
            'description': 'F-string en SQL query',
            'recommendation': 'Use parametrized queries',
            'confidence': 0.95
        },
        {
            'pattern': r'os\.system\s*\(',
            'type': VulnerabilityType.COMMAND_INJECTION,
            'severity': Severity.CRITICAL,
            'description': 'Uso de os.system()',
            'recommendation': 'Use subprocess con argumentos separados',
            'confidence': 0.85
        },
        {
            'pattern': r'subprocess\.(call|Popen|run)\s*\([^,]*shell\s*=\s*True',
            'type': VulnerabilityType.COMMAND_INJECTION,
            'severity': Severity.HIGH,
            'description': 'subprocess con shell=True',
            'recommendation': 'Evite shell=True',
            'confidence': 0.90
        },
        {
            'pattern': r'eval\s*\(',
            'type': VulnerabilityType.COMMAND_INJECTION,
            'severity': Severity.CRITICAL,
            'description': 'Uso de eval()',
            'recommendation': 'Use ast.literal_eval() o alternativas',
            'confidence': 0.95
        },
        {
            'pattern': r'exec\s*\(',
            'type': VulnerabilityType.COMMAND_INJECTION,
            'severity': Severity.CRITICAL,
            'description': 'Uso de exec()',
            'recommendation': 'Refactorice para evitar exec()',
            'confidence': 0.95
        },
        {
            'pattern': r'pickle\.(loads|load)\s*\(',
            'type': VulnerabilityType.UNSAFE_DESERIALIZATION,
            'severity': Severity.HIGH,
            'description': 'Deserialización con pickle',
            'recommendation': 'Use JSON o valide datos pickle',
            'confidence': 0.85
        },
        {
            'pattern': r'(password|passwd|secret|token|api_key)\s*=\s*["\'][^"\']{8,}["\']',
            'type': VulnerabilityType.HARDCODED_SECRET,
            'severity': Severity.HIGH,
            'description': 'Posible secreto hardcodeado',
            'recommendation': 'Use variables de entorno',
            'confidence': 0.70
        },
    ]
    
    JAVASCRIPT_PATTERNS = [
        {
            'pattern': r'innerHTML\s*=',
            'type': VulnerabilityType.XSS,
            'severity': Severity.HIGH,
            'description': 'Uso de innerHTML',
            'recommendation': 'Use textContent o DOMPurify',
            'confidence': 0.80
        },
        {
            'pattern': r'document\.write\s*\(',
            'type': VulnerabilityType.XSS,
            'severity': Severity.HIGH,
            'description': 'Uso de document.write()',
            'recommendation': 'Use métodos modernos de DOM',
            'confidence': 0.85
        },
        {
            'pattern': r'dangerouslySetInnerHTML',
            'type': VulnerabilityType.XSS,
            'severity': Severity.HIGH,
            'description': 'dangerouslySetInnerHTML en React',
            'recommendation': 'Sanitice con DOMPurify',
            'confidence': 0.90
        },
        {
            'pattern': r'eval\s*\(',
            'type': VulnerabilityType.COMMAND_INJECTION,
            'severity': Severity.CRITICAL,
            'description': 'Uso de eval()',
            'recommendation': 'Use JSON.parse() o alternativas',
            'confidence': 0.95
        },
        {
            'pattern': r'(password|passwd|secret|token|apiKey|api_key)\s*[:=]\s*["\'][^"\']{8,}["\']',
            'type': VulnerabilityType.HARDCODED_SECRET,
            'severity': Severity.HIGH,
            'description': 'Posible secreto hardcodeado',
            'recommendation': 'Use variables de entorno',
            'confidence': 0.70
        },
    ]
    
    @classmethod
    def get_patterns(cls, filename: str) -> List[Dict]:
        """Obtiene patrones según lenguaje"""
        ext = filename.split('.')[-1].lower()
        if ext in ['py']:
            return cls.PYTHON_PATTERNS
        elif ext in ['js', 'jsx', 'ts', 'tsx']:
            return cls.JAVASCRIPT_PATTERNS
        return []


class IntegratedSecurityScanner:
    """Escáner integrado con ML y detección detallada"""
    
    def __init__(self, model_path: str = None):
        self.model = None
        if HAS_ML and model_path and os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                print(f"✓ Modelo ML cargado: {model_path}")
            except Exception as e:
                print(f"⚠ Error cargando modelo ML: {e}")
    
    def detect_detailed_vulnerabilities(self, code: str, filename: str) -> List[Vulnerability]:
        """Detecta vulnerabilidades con detalles"""
        vulnerabilities = []
        patterns = VulnerabilityPatterns.get_patterns(filename)
        lines = code.split('\n')
        
        for line_num, line in enumerate(lines, start=1):
            line_stripped = line.strip()
            if line_stripped.startswith('#') or line_stripped.startswith('//'):
                continue
            
            for pattern_info in patterns:
                if re.search(pattern_info['pattern'], line, re.IGNORECASE):
                    vuln = Vulnerability(
                        type=pattern_info['type'],
                        severity=pattern_info['severity'],
                        line_number=line_num,
                        code_snippet=line.strip()[:100],
                        description=pattern_info['description'],
                        recommendation=pattern_info['recommendation'],
                        confidence=pattern_info.get('confidence', 1.0)
                    )
                    vulnerabilities.append(vuln)
        
        return vulnerabilities
    
    def extract_ml_features(self, code: str, filename: str) -> Dict:
        """Extrae características para modelo ML"""
        features = {
            'nloc': 0,
            'avg_complexity': 0,
            'max_complexity': 0,
            'risk_keywords': 0
        }
        
        if HAS_ML:
            try:
                analysis = lizard.analyze_file.analyze_source_code(filename, code)
                features['nloc'] = analysis.nloc
                features['avg_complexity'] = analysis.average_cyclomatic_complexity
                features['max_complexity'] = max(
                    [f.cyclomatic_complexity for f in analysis.function_list]
                ) if analysis.function_list else 0
            except:
                features['nloc'] = len(code.split('\n'))
        
        return features
    
    def analyze_file(self, filepath: str) -> Dict[str, Any]:
        """Analiza un archivo completo"""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                code = f.read()
        except Exception as e:
            return {
                'file': filepath,
                'status': 'ERROR',
                'error': str(e)
            }
        
        # Detección detallada
        detailed_vulns = self.detect_detailed_vulnerabilities(code, filepath)
        
        # Características ML
        ml_features = self.extract_ml_features(code, filepath)
        
        # Predicción ML (si disponible)
        ml_prediction = None
        ml_probability = 0.0
        
        if self.model and HAS_ML:
            try:
                data_payload = {
                    'repo': 'ChatEnTiempoRealV2',
                    'sha': 'HEAD',
                    'filename': filepath,
                    'code': code,
                    'label': 0,
                    **ml_features
                }
                df_input = pd.DataFrame([data_payload])
                ml_probability = self.model.predict_proba(df_input)[0][1]
                ml_prediction = self.model.predict(df_input)[0]
            except Exception as e:
                print(f"⚠ ML prediction error: {e}")
        
        # Calcular severidad máxima
        severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
        max_severity = None
        for sev in severity_order:
            if any(v.severity.value == sev for v in detailed_vulns):
                max_severity = sev
                break
        
        # Determinar si es vulnerable
        is_vulnerable = (
            len(detailed_vulns) > 0 or
            (ml_prediction == 1 if ml_prediction is not None else False) or
            ml_probability > 0.5
        )
        
        # Preparar detalles de vulnerabilidades
        vulnerability_details = []
        for vuln in detailed_vulns:
            vulnerability_details.append({
                'type': vuln.type.value,
                'severity': vuln.severity.value,
                'line': vuln.line_number,
                'code': vuln.code_snippet,
                'description': vuln.description,
                'recommendation': vuln.recommendation,
                'confidence': vuln.confidence
            })
        
        # Agrupar por severidad
        by_severity = {}
        for vuln in detailed_vulns:
            sev = vuln.severity.value
            by_severity[sev] = by_severity.get(sev, 0) + 1
        
        # Agrupar por tipo
        by_type = {}
        for vuln in detailed_vulns:
            typ = vuln.type.value
            by_type[typ] = by_type.get(typ, 0) + 1
        
        return {
            'file': filepath,
            'status': 'VULNERABLE' if is_vulnerable else 'SECURE',
            'vulnerability_count': len(detailed_vulns),
            'max_severity': max_severity,
            'by_severity': by_severity,
            'by_type': by_type,
            'ml_probability': float(ml_probability),
            'ml_prediction': bool(ml_prediction) if ml_prediction is not None else None,
            'nloc': ml_features['nloc'],
            'complexity': ml_features['max_complexity'],
            'vulnerabilities': vulnerability_details
        }
    
    def analyze_files(self, files: List[str]) -> Dict[str, Any]:
        """Analiza múltiples archivos"""
        results = []
        vulnerable_count = 0
        total_vulnerabilities = 0
        
        for filepath in files:
            if not os.path.exists(filepath):
                continue
            
            result = self.analyze_file(filepath)
            results.append(result)
            
            if result['status'] == 'VULNERABLE':
                vulnerable_count += 1
                total_vulnerabilities += result.get('vulnerability_count', 0)
        
        max_risk = max([r.get('ml_probability', 0) for r in results], default=0)
        
        return {
            'status': 'VULNERABLE' if vulnerable_count > 0 else 'SECURE',
            'files_analyzed': len(results),
            'vulnerable_files': vulnerable_count,
            'total_vulnerabilities': total_vulnerabilities,
            'max_risk_probability': max_risk,
            'results': results
        }


def main():
    """Función principal"""
    # Obtener archivos a escanear
    files_to_scan = []
    
    if os.path.exists('changed_files.txt'):
        with open('changed_files.txt', 'r') as f:
            files_to_scan = [line.strip() for line in f if line.strip()]
    
    if not files_to_scan:
        # Escanear archivos comunes
        for ext in ['*.py', '*.js', '*.jsx', '*.ts', '*.tsx']:
            files_to_scan.extend([str(p) for p in Path('.').rglob(ext)])
    
    files_to_scan = [f for f in files_to_scan if os.path.exists(f)][:50]
    
    if not files_to_scan:
        print("⚠ No files to scan")
        sys.exit(0)
    
    # Crear escáner
    model_path = os.getenv('MODEL_PATH', 'models/modelo_seguridad_final2.pkl')
    scanner = IntegratedSecurityScanner(model_path)
    
    print(f"\n{'='*80}")
    print("INTEGRATED SECURITY SCAN")
    print(f"{'='*80}")
    print(f"Files to analyze: {len(files_to_scan)}")
    print(f"ML Model: {'Active' if scanner.model else 'Not available'}")
    print(f"{'='*80}\n")
    
    # Analizar archivos
    summary = scanner.analyze_files(files_to_scan)
    
    # Guardar resultados
    with open('security_result.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Outputs para GitHub Actions
    vulnerable_files = [
        r['file'] for r in summary['results'] 
        if r['status'] == 'VULNERABLE'
    ]
    vulnerable_files_str = ','.join(vulnerable_files) if vulnerable_files else ''
    
    with open(os.environ.get('GITHUB_OUTPUT', '/dev/null'), 'a') as fh:
        fh.write(f'is_vulnerable={str(summary["vulnerable_files"] > 0).lower()}\n')
        fh.write(f'status={summary["status"]}\n')
        fh.write(f'risk_probability={summary["max_risk_probability"]:.2f}\n')
        fh.write(f'vulnerable_files={vulnerable_files_str}\n')
        fh.write(f'total_vulnerabilities={summary["total_vulnerabilities"]}\n')
    
    # Imprimir resumen
    print(f"\n{'='*80}")
    print("SCAN RESULTS")
    print(f"{'='*80}")
    print(f"Status: {summary['status']}")
    print(f"Files analyzed: {summary['files_analyzed']}")
    print(f"Vulnerable files: {summary['vulnerable_files']}")
    print(f"Total vulnerabilities: {summary['total_vulnerabilities']}")
    print(f"Max risk probability: {summary['max_risk_probability']:.2%}")
    
    if vulnerable_files:
        print(f"\n🔴 VULNERABLE FILES:")
        for result in summary['results']:
            if result['status'] == 'VULNERABLE':
                print(f"\n  📄 {result['file']}")
                print(f"     Vulnerabilities: {result['vulnerability_count']}")
                if result['max_severity']:
                    print(f"     Max Severity: {result['max_severity']}")
                if result['by_severity']:
                    print(f"     By Severity: {result['by_severity']}")
                print(f"     ML Risk: {result['ml_probability']:.1%}")
    
    print(f"\n{'='*80}\n")
    
    # Exit code
    sys.exit(1 if summary['vulnerable_files'] > 0 else 0)


if __name__ == '__main__':
    main()