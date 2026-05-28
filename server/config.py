"""
Конфигурация базы данных и приложения
"""
import os

# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', 'root'),
    'database': os.environ.get('DB_NAME', 'contact_forms'),
}

# Admin credentials (HTTP Basic Auth)
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Secret key for session cookies
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Application settings
HOST = os.environ.get('APP_HOST', '0.0.0.0')
PORT = int(os.environ.get('APP_PORT', 8000))
