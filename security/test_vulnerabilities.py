"""
Archivo de ejemplo con vulnerabilidades para testing
NO USAR EN PRODUCCIÓN
"""

import os
import subprocess
import pickle
import hashlib
import random
from pathlib import Path


# ========== SQL INJECTION VULNERABILITIES ==========

def get_user_by_id_vulnerable(cursor, user_id):
    """VULNERABLE: String formatting en SQL"""
    query = "SELECT * FROM users WHERE id = %s" % user_id
    cursor.execute(query)
    return cursor.fetchone()


def search_users_vulnerable(cursor, search_term):
    """VULNERABLE: F-string en SQL"""
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"
    cursor.execute(query)
    return cursor.fetchall()


def delete_user_vulnerable(cursor, user_id):
    """VULNERABLE: Concatenación en SQL"""
    query = "DELETE FROM users WHERE id = " + str(user_id)
    cursor.execute(query)


# ========== COMMAND INJECTION VULNERABILITIES ==========

def execute_system_command_vulnerable(command):
    """VULNERABLE: Uso de os.system"""
    os.system(command)


def run_with_shell_vulnerable(user_input):
    """VULNERABLE: subprocess con shell=True"""
    subprocess.run(f"echo {user_input}", shell=True)


def dynamic_code_execution_vulnerable(code):
    """VULNERABLE: Uso de eval"""
    result = eval(code)
    return result


def execute_code_vulnerable(code):
    """VULNERABLE: Uso de exec"""
    exec(code)


# ========== PATH TRAVERSAL VULNERABILITIES ==========

def read_file_vulnerable(filename):
    """VULNERABLE: Path concatenation sin validación"""
    file_path = "/var/data/" + filename
    with open(file_path, 'r') as f:
        return f.read()


# ========== WEAK CRYPTOGRAPHY ==========

def hash_password_vulnerable(password):
    """VULNERABLE: Uso de MD5"""
    return hashlib.md5(password.encode()).hexdigest()


def hash_token_vulnerable(token):
    """VULNERABLE: Uso de SHA1"""
    return hashlib.sha1(token.encode()).hexdigest()


# ========== INSECURE RANDOM ==========

def generate_token_vulnerable():
    """VULNERABLE: random no criptográfico para tokens"""
    return str(random.randint(100000, 999999))


def generate_session_id_vulnerable():
    """VULNERABLE: random.choice para seguridad"""
    chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    return ''.join(random.choice(chars) for _ in range(32))


# ========== UNSAFE DESERIALIZATION ==========

def load_user_data_vulnerable(data):
    """VULNERABLE: pickle.loads sin validación"""
    return pickle.loads(data)


def deserialize_object_vulnerable(file_path):
    """VULNERABLE: pickle.load de archivo"""
    with open(file_path, 'rb') as f:
        return pickle.load(f)


# ========== HARDCODED SECRETS ==========

# VULNERABLE: Secrets hardcodeados
DATABASE_PASSWORD = "mySecretP@ssw0rd123"
API_KEY = "sk-1234567890abcdefghijklmnop"
SECRET_TOKEN = "super_secret_token_12345"
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"


def connect_database_vulnerable():
    """VULNERABLE: Password hardcodeado"""
    password = "admin123456"
    return f"postgresql://user:{password}@localhost/db"


# ========== MÚLTIPLES VULNERABILIDADES ==========

def dangerous_function(user_input, db_cursor):
    """
    VULNERABLE: Múltiples problemas de seguridad
    - Command injection
    - SQL injection
    - Path traversal
    """
    # Command injection
    os.system(f"ping {user_input}")
    
    # SQL injection
    query = f"SELECT * FROM logs WHERE user = '{user_input}'"
    db_cursor.execute(query)
    
    # Path traversal
    log_file = "/var/log/" + user_input + ".log"
    with open(log_file, 'r') as f:
        data = f.read()
    
    # Unsafe eval
    result = eval(user_input)
    
    return result


# ========== MAIN ==========

if __name__ == "__main__":
    print("Este archivo contiene vulnerabilidades intencionales para testing")
    print("NO EJECUTAR EN PRODUCCIÓN")
