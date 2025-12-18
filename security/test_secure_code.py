"""
Archivo de ejemplo con código SEGURO
Mejores prácticas de seguridad
"""

import os
import subprocess
import json
import hashlib
import secrets
from pathlib import Path


# ========== SQL QUERIES SEGURAS ==========

def get_user_by_id_secure(cursor, user_id):
    """SEGURO: Parametrized query"""
    query = "SELECT * FROM users WHERE id = %s"
    cursor.execute(query, (user_id,))
    return cursor.fetchone()


def search_users_secure(cursor, search_term):
    """SEGURO: Parametrized query con LIKE"""
    query = "SELECT * FROM users WHERE name LIKE %s"
    cursor.execute(query, (f"%{search_term}%",))
    return cursor.fetchall()


def delete_user_secure(cursor, user_id):
    """SEGURO: Parametrized query para DELETE"""
    query = "DELETE FROM users WHERE id = %s"
    cursor.execute(query, (user_id,))


# ========== COMMAND EXECUTION SEGURA ==========

def execute_command_secure(args):
    """SEGURO: subprocess sin shell, con lista de argumentos"""
    # args debe ser una lista validada
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout


def run_validated_command_secure(user_input):
    """SEGURO: Validación estricta de entrada"""
    # Whitelist de comandos permitidos
    allowed_commands = ['ls', 'pwd', 'date']
    
    if user_input not in allowed_commands:
        raise ValueError("Comando no permitido")
    
    result = subprocess.run([user_input], capture_output=True, text=True)
    return result.stdout


def parse_json_secure(json_string):
    """SEGURO: Usar JSON en lugar de eval"""
    try:
        return json.loads(json_string)
    except json.JSONDecodeError:
        return None


# ========== FILE HANDLING SEGURO ==========

def read_file_secure(filename, base_dir="/var/data"):
    """SEGURO: Validación de path con Path().resolve()"""
    base_path = Path(base_dir).resolve()
    file_path = (base_path / filename).resolve()
    
    # Verificar que el archivo esté dentro del directorio permitido
    if not str(file_path).startswith(str(base_path)):
        raise ValueError("Path traversal detectado")
    
    # Verificar que el archivo existe
    if not file_path.exists():
        raise FileNotFoundError("Archivo no encontrado")
    
    with open(file_path, 'r') as f:
        return f.read()


def sanitize_filename(filename):
    """SEGURO: Sanitizar nombres de archivo"""
    # Remover caracteres peligrosos
    safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
    return ''.join(c for c in filename if c in safe_chars)


# ========== CRYPTOGRAPHY SEGURA ==========

def hash_password_secure(password):
    """SEGURO: Uso de SHA-256 (mejor: usar bcrypt o argon2)"""
    return hashlib.sha256(password.encode()).hexdigest()


def hash_password_best_practice(password):
    """MEJOR PRÁCTICA: Usar bcrypt/argon2"""
    import bcrypt
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt)


# ========== SECURE RANDOM ==========

def generate_token_secure():
    """SEGURO: secrets para tokens criptográficos"""
    return secrets.token_hex(32)


def generate_session_id_secure():
    """SEGURO: secrets.token_urlsafe"""
    return secrets.token_urlsafe(32)


def generate_otp_secure():
    """SEGURO: secrets.randbelow para OTP"""
    return str(secrets.randbelow(1000000)).zfill(6)


# ========== SERIALIZATION SEGURA ==========

def save_user_data_secure(data, file_path):
    """SEGURO: JSON en lugar de pickle"""
    with open(file_path, 'w') as f:
        json.dump(data, f)


def load_user_data_secure(file_path):
    """SEGURO: JSON en lugar de pickle"""
    with open(file_path, 'r') as f:
        return json.load(f)


# ========== CONFIGURATION MANAGEMENT SEGURA ==========

def get_database_password_secure():
    """SEGURO: Variables de entorno"""
    password = os.getenv('DATABASE_PASSWORD')
    if not password:
        raise ValueError("DATABASE_PASSWORD no configurada")
    return password


def get_api_key_secure():
    """SEGURO: Variables de entorno con validación"""
    api_key = os.getenv('API_KEY')
    if not api_key or len(api_key) < 20:
        raise ValueError("API_KEY inválida o no configurada")
    return api_key


def connect_database_secure():
    """SEGURO: Configuración desde entorno"""
    host = os.getenv('DB_HOST', 'localhost')
    port = os.getenv('DB_PORT', '5432')
    database = os.getenv('DB_NAME', 'mydb')
    user = os.getenv('DB_USER', 'postgres')
    password = get_database_password_secure()
    
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


# ========== INPUT VALIDATION ==========

def validate_user_input(user_input, allowed_pattern):
    """SEGURO: Validación con regex whitelist"""
    import re
    if not re.match(allowed_pattern, user_input):
        raise ValueError("Input inválido")
    return user_input


def sanitize_html(html_string):
    """SEGURO: Sanitización de HTML"""
    # En producción, usar biblioteca como bleach
    import html
    return html.escape(html_string)


# ========== EJEMPLO COMPLETO SEGURO ==========

def process_user_request_secure(user_id, action, db_cursor):
    """
    SEGURO: Múltiples capas de seguridad
    - Input validation
    - Parametrized queries
    - Error handling
    - Logging seguro
    """
    import logging
    
    # Validar user_id
    if not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id inválido")
    
    # Validar action
    allowed_actions = ['view', 'edit', 'delete']
    if action not in allowed_actions:
        raise ValueError("Acción no permitida")
    
    # Query segura
    query = "SELECT * FROM users WHERE id = %s AND active = TRUE"
    db_cursor.execute(query, (user_id,))
    user = db_cursor.fetchone()
    
    if not user:
        logging.warning(f"Usuario {user_id} no encontrado")
        return None
    
    # Log seguro (sin datos sensibles)
    logging.info(f"Acción '{action}' ejecutada para usuario {user_id}")
    
    return user


# ========== MAIN ==========

if __name__ == "__main__":
    print("Este archivo contiene ejemplos de código SEGURO")
    print("Úselo como referencia para mejores prácticas")
