"""
Módulo con VULNERABILIDADES - Test para verificar que el escáner BLOQUEA código inseguro
❌ Este archivo debería FALLAR el escaneo y bloquear el merge
"""

import os
import hashlib
import random
import pickle
import subprocess


class InsecureAuth:
    """Autenticación INSEGURA - contiene múltiples vulnerabilidades"""
    
    # ❌ VULNERABLE: Hardcoded secret
    API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz"
    SECRET_TOKEN = "super_secret_token_12345678"
    
    def __init__(self):
        # ❌ VULNERABLE: Password hardcodeado
        self.admin_password = "admin123456789"
    
    def hash_password_weak(self, password: str) -> str:
        """❌ VULNERABLE: MD5 es débil"""
        return hashlib.md5(password.encode()).hexdigest()
    
    def generate_token_insecure(self) -> str:
        """❌ VULNERABLE: random no es criptográficamente seguro"""
        return str(random.randint(100000, 999999))


class InsecureDB:
    """Queries INSEGURAS - SQL Injection"""
    
    def get_user_vulnerable(self, cursor, user_id):
        """❌ VULNERABLE: String formatting en SQL"""
        query = "SELECT * FROM users WHERE id = %s" % user_id
        cursor.execute(query)
        return cursor.fetchone()
    
    def search_vulnerable(self, cursor, search_term):
        """❌ VULNERABLE: F-string en SQL"""
        query = f"SELECT * FROM users WHERE name = '{search_term}'"
        cursor.execute(query)
        return cursor.fetchall()
    
    def delete_user_vulnerable(self, cursor, user_id):
        """❌ VULNERABLE: Concatenación en SQL"""
        query = "DELETE FROM users WHERE id = " + str(user_id)
        cursor.execute(query)


class InsecureCommandExecutor:
    """Ejecución insegura de comandos"""
    
    def run_system_command(self, command):
        """❌ VULNERABLE: os.system"""
        os.system(command)
    
    def run_with_shell(self, user_input):
        """❌ VULNERABLE: shell=True"""
        subprocess.run(f"echo {user_input}", shell=True)
    
    def evaluate_code(self, code):
        """❌ VULNERABLE: eval"""
        return eval(code)
    
    def execute_code(self, code):
        """❌ VULNERABLE: exec"""
        exec(code)


class InsecureDataHandler:
    """Manejo inseguro de datos"""
    
    def load_pickle_data(self, data):
        """❌ VULNERABLE: pickle.loads sin validación"""
        return pickle.loads(data)
    
    def deserialize_file(self, filepath):
        """❌ VULNERABLE: pickle.load"""
        with open(filepath, 'rb') as f:
            return pickle.load(f)


def dangerous_function(user_input, cursor):
    """
    ❌ MÚLTIPLES VULNERABILIDADES en una sola función
    """
    # Command injection
    os.system(f"ping {user_input}")
    
    # SQL injection
    query = f"SELECT * FROM logs WHERE user = '{user_input}'"
    cursor.execute(query)
    
    # Code execution
    result = eval(user_input)
    
    return result


# Más secrets hardcodeados
DATABASE_PASSWORD = "mySecretDBPass123!"
JWT_SECRET = "jwt_secret_key_production_2024"


if __name__ == "__main__":
    print("❌ Este código contiene VULNERABILIDADES")
    print("Debería BLOQUEAR el merge")
