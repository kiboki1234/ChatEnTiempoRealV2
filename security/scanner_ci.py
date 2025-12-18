import sys
import os
import joblib
import pandas as pd
import lizard
import re
import json

# --- 1. CONFIGURACIÓN ROBUSTA DE RUTAS ---
# Esto permite que el script encuentre el .pkl aunque se ejecute desde la raíz
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "modelo_seguridad_final2.pkl") 
# ^^^ ASEGÚRATE QUE EL NOMBRE DEL ARCHIVO COINCIDA ^^^

RISK_PATTERNS = {
    'py': [r'eval\(', r'exec\(', r'subprocess\.', r'os\.system', r'cursor\.execute'],
    'js': [r'eval\(', r'innerHTML', r'document\.write', r'dangerouslySetInnerHTML'],
    'cpp': [r'strcpy', r'strcat', r'system\(', r'sprintf']
}

def extract_features(code, filename):
    """
    IMPORTANTE: Esta función debe ser IDÉNTICA a la que usaste para entrenar.
    Adapta para incluir métricas extra para el reporte.
    """
    features = {'nloc': 0, 'avg_complexity': 0, 'max_complexity': 0, 'risk_keywords': 0, 'findings': []}
    try:
        obj = lizard.analyze_file.analyze_source_code(filename, code)
        features['nloc'] = obj.nloc
        features['avg_complexity'] = obj.average_cyclomatic_complexity
        features['max_complexity'] = max([f.cyclomatic_complexity for f in obj.function_list]) if obj.function_list else 0
    except:
        features['nloc'] = len(code.split('\n'))
    
    # Conteo de keywords y extracción de patrones
    ext = filename.split('.')[-1]
    count = 0
    if ext in RISK_PATTERNS:
        lines = code.split('\n')
        for i, line in enumerate(lines):
            for p in RISK_PATTERNS[ext]:
                if re.search(p, line): 
                    count += 1
                    # Capture finding for Telegram report
                    clean_pat = p.replace('\\', '')
                    clean_line = line.strip()[:100]
                    features['findings'].append({
                        'line': i + 1,
                        'pattern': clean_pat,
                        'content': clean_line
                    })

    features['risk_keywords'] = count
    # For model compatibility (if it expects list of patterns, which it likely doesn't based on previous errors, but we keep text patterns for JSON)
    features['found_patterns'] = [f['pattern'] for f in features['findings']]
    
    return features

def main():
    # Recibimos la lista de archivos desde GitHub Actions
    # Si no hay args, buscamos changed_files.txt (fallback del workflow anterior)
    files_to_scan = sys.argv[1:]
    
    # Fallback to file reading if no args provided (backward compatibility)
    if not files_to_scan and os.path.exists('changed_files.txt'):
        try:
            with open('changed_files.txt', 'r') as f:
                files_to_scan = [line.strip() for line in f if line.strip()]
        except: pass
        
    files_to_scan = [f for f in files_to_scan if os.path.exists(f)]

    if not files_to_scan:
        print("ℹ️ No hay archivos para escanear.")
        # Generar JSON vacío para no romper steps siguientes
        save_json_report([]) 
        sys.exit(0)

    try:
        model = joblib.load(MODEL_PATH)
        print(f"🧠 Modelo cargado desde: {MODEL_PATH}")
    except Exception as e:
        print(f"❌ Error fatal cargando el modelo: {e}")
        sys.exit(1)

    vulnerables = 0
    detailed_results = []
    print(f"🔍 Analizando {len(files_to_scan)} archivos modificados...")

    for filename in files_to_scan:
        # Ignorar archivos que no sean de código adecuado
        if not filename.endswith(('.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c')):
            continue

        try:
            with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
                code = f.read()

            features = extract_features(code, filename)
            
            # Preparar DataFrame para el modelo V2
            # El modelo espera: ['repo', 'sha', 'filename', 'code', 'label', 'nloc', 'avg_complexity', 'max_complexity', 'risk_keywords']
            data_payload = {
                'repo': 'generic_repo',
                'sha': 'HEAD',
                'filename': filename,
                'code': code,
                'label': 0,
                'nloc': features['nloc'],
                'avg_complexity': features['avg_complexity'],
                'max_complexity': features['max_complexity'],
                'risk_keywords': features['risk_keywords']
            }
            
            df = pd.DataFrame([data_payload])
            # Ensure proper column selection for pipeline
            required_cols = ['repo', 'sha', 'filename', 'code', 'label', 'nloc', 'avg_complexity', 'max_complexity', 'risk_keywords']
            df = df[required_cols]
            
            probabilidad = model.predict_proba(df)[0][1]
            prediction = model.predict(df)[0]
            is_vulnerable = prediction == 1 or probabilidad > 0.55

            status = 'VULNERABLE' if is_vulnerable else 'SECURE'
            
            # Resultado para JSON
            result_entry = {
                'file': filename,
                'status': status,
                'risk_probability': float(probabilidad),
                'risk_keywords': features['risk_keywords'],
                'nloc': features['nloc'],
                'complexity': features['max_complexity'],
                'findings': features['findings'],
                'patterns': features['found_patterns']
            }
            detailed_results.append(result_entry)

            if is_vulnerable:
                vulnerables += 1
                print(f"\n🚨 [VULNERABLE] {filename}")
                print(f"   Riesgo: {probabilidad:.2%} | Complejidad: {features['avg_complexity']}")
                print("-" * 30)
            else:
                print(f"✅ [SEGURO] {filename} ({probabilidad:.1%})")

        except Exception as e:
            print(f"⚠️ Error leyendo {filename}: {e}")
            detailed_results.append({'file': filename, 'status': 'ERROR', 'error': str(e)})

    # Guardar reporte JSON para Telegram
    save_json_report(detailed_results)
    
    # Escribir outputs para GitHub Actions
    write_github_output(detailed_results, vulnerables)

    if vulnerables > 0:
        print(f"\n🚫 BLOQUEO: Se encontraron {vulnerables} archivos peligrosos.")
        sys.exit(1) # ESTO ROMPE EL PIPELINE
    else:
        print("\n✨ APROBADO: El código es seguro.")
        sys.exit(0)

def save_json_report(results):
    vulnerable_count = sum(1 for r in results if r.get('status') == 'VULNERABLE')
    max_risk = max([r.get('risk_probability', 0) for r in results], default=0)
    
    summary = {
        'status': 'VULNERABLE' if vulnerable_count > 0 else 'SECURE',
        'risk_probability': max_risk,
        'files_analyzed': len(results),
        'vulnerabilities_found': vulnerable_count,
        'details': results
    }
    
    with open('security_result.json', 'w') as f:
        json.dump(summary, f, indent=2)

def write_github_output(results, vulnerable_count):
    if 'GITHUB_OUTPUT' in os.environ:
        vulnerable_files = [r['file'] for r in results if r.get('status') == 'VULNERABLE']
        vulnerable_files_str = ','.join(vulnerable_files) if vulnerable_files else ''
        status = 'VULNERABLE' if vulnerable_count > 0 else 'SECURE'
        max_risk = max([r.get('risk_probability', 0) for r in results], default=0)
        
        with open(os.environ['GITHUB_OUTPUT'], 'a') as fh:
            fh.write(f'is_vulnerable={str(vulnerable_count > 0).lower()}\n')
            fh.write(f'status={status}\n')
            fh.write(f'risk_probability={max_risk:.2f}\n')
            fh.write(f'vulnerable_files={vulnerable_files_str}\n')

if __name__ == "__main__":
    main()
