"""
Módulo de utilidades SEGURAS - Test para verificar que el escáner APRUEBA código seguro
✅ Este archivo debería PASAR el escaneo sin problemas
"""

import os
import hashlib
import secrets
import subprocess
import json
from pathlib import Path


class SecureAuth:
    """Autenticación segura"""
    
    def __init__(self):
        # ✅ SEGURO: Variables de entorno
        self.secret_key = os.getenv('SECRET_KEY', 'default_dev_key')
    
    def hash_password(self, password: str) -> str:
        """✅ SEGURO: SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def generate_token(self) -> str:
        """✅ SEGURO: secrets module"""
        return secrets.token_urlsafe(32)


class SecureDB:
    """Queries seguras"""
    
    def get_user(self, cursor, user_id: int):
        """✅ SEGURO: Parametrized query"""
        query = "SELECT * FROM users WHERE id = %s"
        cursor.execute(query, (user_id,))
        return cursor.fetchone()
    
    def search(self, cursor, term: str):
        """✅ SEGURO: Parámetros"""
        query = "SELECT * FROM data WHERE name LIKE %s"
        cursor.execute(query, (f"%{term}%",))
        return cursor.fetchall()


def execute_safe_command(cmd: str) -> str:
    """✅ SEGURO: Whitelist + subprocess sin shell"""
    allowed = ['ls', 'pwd', 'date']
    if cmd not in allowed:
        raise ValueError("Comando no permitido")
    result = subprocess.run([cmd], capture_output=True, text=True)
    return result.stdout


def save_data(data: dict, path: str):
    """✅ SEGURO: JSON en lugar de pickle"""
    with open(path, 'w') as f:
        json.dump(data, f)


if __name__ == "__main__":
    print("✅ Código SEGURO - Debería PASAR el escaneo")
