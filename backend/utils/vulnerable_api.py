"""
Módulo de API REST con MÚLTIPLES VULNERABILIDADES
⚠️ CÓDIGO VULNERABLE - NO USAR EN PRODUCCIÓN
"""
import os
import pickle
import subprocess
from flask import Flask, request, jsonify, make_response
import sqlite3

app = Flask(__name__)

# ❌ CRÍTICO: Credenciales hardcodeadas
DATABASE_PASSWORD = "admin123"
API_SECRET_KEY = "sk-1234567890abcdef"
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
JWT_SECRET = "my_super_secret_jwt_key_2024"


@app.route('/api/login', methods=['POST'])
def login():
    """❌ VULNERABILIDAD: SQL Injection"""
    username = request.json.get('username')
    password = request.json.get('password')
    
    # ❌ SQL Injection: Concatenación directa sin sanitización
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(query)  # ❌ Ejecuta query vulnerable
    user = cursor.fetchone()
    
    if user:
        return jsonify({"status": "success", "token": API_SECRET_KEY})
    return jsonify({"status": "error"}), 401


@app.route('/api/search', methods=['GET'])
def search():
    """❌ VULNERABILIDAD: SQL Injection en búsqueda"""
    search_term = request.args.get('q', '')
    
    # ❌ SQL Injection con LIKE
    query = f"SELECT * FROM products WHERE name LIKE '%{search_term}%'"
    conn = sqlite3.connect('products.db')
    results = conn.execute(query).fetchall()
    
    return jsonify(results)


@app.route('/api/execute', methods=['POST'])
def execute_command():
    """❌ VULNERABILIDAD CRÍTICA: Command Injection"""
    command = request.json.get('command')
    
    # ❌ Command Injection: Ejecución directa de comandos
    output = os.system(command)
    
    # ❌ Subprocess sin validación
    result = subprocess.run(command, shell=True, capture_output=True)
    
    return jsonify({"output": str(output), "result": result.stdout.decode()})


@app.route('/api/eval', methods=['POST'])
def eval_code():
    """❌ VULNERABILIDAD CRÍTICA: Code Injection"""
    code = request.json.get('code')
    
    # ❌ eval() permite ejecución arbitraria de código
    result = eval(code)
    
    # ❌ exec() también es peligroso
    exec(code)
    
    return jsonify({"result": result})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """❌ VULNERABILIDAD: Path Traversal y deserialización insegura"""
    file = request.files.get('file')
    filename = request.form.get('filename')
    
    # ❌ Path Traversal: No valida el nombre del archivo
    filepath = f"/uploads/{filename}"
    file.save(filepath)
    
    # ❌ Deserialización insegura con pickle
    with open(filepath, 'rb') as f:
        data = pickle.load(f)  # ❌ pickle.load es inseguro
    
    return jsonify({"status": "uploaded", "data": str(data)})


@app.route('/api/render', methods=['POST'])
def render_template():
    """❌ VULNERABILIDAD: Server-Side Template Injection (SSTI)"""
    from jinja2 import Template
    
    template_string = request.json.get('template')
    
    # ❌ SSTI: Renderiza templates sin sanitización
    template = Template(template_string)
    output = template.render(request=request)
    
    return output


@app.route('/api/proxy', methods=['GET'])
def proxy_request():
    """❌ VULNERABILIDAD: Server-Side Request Forgery (SSRF)"""
    import requests
    
    url = request.args.get('url')
    
    # ❌ SSRF: Hace requests sin validar URL
    response = requests.get(url)
    
    return response.content


@app.route('/api/redirect', methods=['GET'])
def redirect_user():
    """❌ VULNERABILIDAD: Open Redirect"""
    target_url = request.args.get('url')
    
    # ❌ Redirección sin validar destino
    response = make_response()
    response.headers['Location'] = target_url
    response.status_code = 302
    
    return response


@app.route('/api/debug', methods=['GET'])
def debug_info():
    """❌ VULNERABILIDAD: Information Disclosure"""
    
    # ❌ Expone información sensible
    return jsonify({
        "database_password": DATABASE_PASSWORD,
        "api_key": API_SECRET_KEY,
        "aws_key": AWS_ACCESS_KEY,
        "jwt_secret": JWT_SECRET,
        "environment": os.environ,  # ❌ Expone variables de entorno
        "source_code": open(__file__).read()  # ❌ Expone código fuente
    })


# ❌ VULNERABILIDAD: Weak Cryptography
def encrypt_password(password):
    """❌ Usa algoritmo débil"""
    import hashlib
    # ❌ MD5 es inseguro
    return hashlib.md5(password.encode()).hexdigest()


# ❌ VULNERABILIDAD: Insecure Random
def generate_token():
    """❌ Genera tokens predecibles"""
    import random
    # ❌ random no es criptográficamente seguro
    return ''.join([str(random.randint(0, 9)) for _ in range(10)])


if __name__ == '__main__':
    # ❌ VULNERABILIDAD: Debug mode en producción
    app.run(debug=True, host='0.0.0.0')  # ❌ Expone debugger
