"""
Módulo de acceso a base de datos SEGURO
Demuestra buenas prácticas de seguridad
"""
import hashlib
import secrets
from typing import Optional, Dict, List
import sqlite3
from contextlib import contextmanager


class SafeDatabase:
    """Clase que implementa acceso seguro a base de datos"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()
    
    @contextmanager
    def get_connection(self):
        """Context manager para conexiones seguras"""
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def _init_db(self):
        """Inicializa la base de datos"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
    
    def create_user(self, username: str, password: str, email: Optional[str] = None) -> bool:
        """
        Crea un usuario de forma SEGURA usando prepared statements
        """
        password_hash = self._hash_password(password)
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                # ✅ SEGURO: Uso de prepared statements con placeholders
                cursor.execute(
                    "INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)",
                    (username, password_hash, email)
                )
                return True
        except sqlite3.IntegrityError:
            return False
    
    def get_user(self, username: str) -> Optional[Dict]:
        """
        Obtiene un usuario de forma SEGURA
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # ✅ SEGURO: Prepared statement con placeholder
            cursor.execute(
                "SELECT id, username, email, created_at FROM users WHERE username = ?",
                (username,)
            )
            row = cursor.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'username': row[1],
                    'email': row[2],
                    'created_at': row[3]
                }
            return None
    
    def authenticate_user(self, username: str, password: str) -> bool:
        """
        Autentica un usuario de forma SEGURA
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # ✅ SEGURO: Prepared statement
            cursor.execute(
                "SELECT password_hash FROM users WHERE username = ?",
                (username,)
            )
            row = cursor.fetchone()
            
            if not row:
                return False
            
            stored_hash = row[0]
            return self._verify_password(password, stored_hash)
    
    def search_users(self, search_term: str) -> List[Dict]:
        """
        Busca usuarios de forma SEGURA usando LIKE con prepared statements
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # ✅ SEGURO: LIKE con prepared statement
            search_pattern = f"%{search_term}%"
            cursor.execute(
                "SELECT id, username, email FROM users WHERE username LIKE ? OR email LIKE ?",
                (search_pattern, search_pattern)
            )
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'id': row[0],
                    'username': row[1],
                    'email': row[2]
                })
            return results
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """
        Hashea una contraseña de forma SEGURA
        ✅ Usa SHA-256 con salt
        """
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    @staticmethod
    def _verify_password(password: str, stored_hash: str) -> bool:
        """Verifica una contraseña contra su hash"""
        try:
            salt, hash_value = stored_hash.split(':')
            password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return password_hash == hash_value
        except ValueError:
            return False


def sanitize_input(user_input: str) -> str:
    """
    ✅ SEGURO: Sanitiza entrada de usuario
    """
    # Elimina caracteres peligrosos
    dangerous_chars = ['<', '>', '&', '"', "'", ';', '--']
    sanitized = user_input
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    return sanitized.strip()


def validate_email(email: str) -> bool:
    """
    ✅ SEGURO: Validación básica de email
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
