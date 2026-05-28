"""
Модуль для работы с базой данных MySQL/MariaDB
"""
import mysql.connector
from mysql.connector import Error
import bcrypt
import secrets
import string
from datetime import datetime
from config import DB_CONFIG


def get_db_connection():
    """Создает и возвращает соединение с базой данных"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to database: {e}")
        return None


def init_database():
    """Инициализирует базу данных и создает таблицы"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # Создаем таблицу для хранения данных форм
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                message TEXT,
                login VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                profile_token VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_login (login),
                INDEX idx_profile_token (profile_token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ''')
        
        # Создаем таблицу для администраторов (опционально)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ''')
        
        connection.commit()
        print("Database initialized successfully")
        return True
        
    except Error as e:
        print(f"Error initializing database: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def generate_credentials():
    """Генерирует случайный логин и пароль"""
    login = 'user_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
    password = ''.join(secrets.choice(string.ascii_letters + string.digits + '!@#$%') for _ in range(12))
    return login, password


def hash_password(password):
    """Хеширует пароль с использованием bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password, password_hash):
    """Проверяет пароль против хеша"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def generate_profile_token():
    """Генерирует уникальный токен профиля"""
    return secrets.token_urlsafe(32)


def save_contact_submission(name, phone, email, message):
    """Сохраняет данные формы в базу данных и возвращает учетные данные пользователя"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor()
        
        # Генерируем учетные данные
        login, password = generate_credentials()
        password_hash = hash_password(password)
        profile_token = generate_profile_token()
        
        # Вставляем запись
        cursor.execute('''
            INSERT INTO contact_submissions (name, phone, email, message, login, password_hash, profile_token)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (name, phone, email, message, login, password_hash, profile_token))
        
        connection.commit()
        submission_id = cursor.lastrowid
        
        return {
            'id': submission_id,
            'login': login,
            'password': password,
            'profile_token': profile_token,
            'profile_url': f'/profile/{profile_token}'
        }
        
    except Error as e:
        print(f"Error saving submission: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def get_submission_by_token(profile_token):
    """Получает данные отправки по токену профиля"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute('''
            SELECT id, name, phone, email, message, login, created_at, updated_at
            FROM contact_submissions
            WHERE profile_token = %s
        ''', (profile_token,))
        
        result = cursor.fetchone()
        return result
        
    except Error as e:
        print(f"Error getting submission: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def update_submission(profile_token, name, phone, email, message):
    """Обновляет данные отправки формы (кроме логина и пароля)"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        cursor.execute('''
            UPDATE contact_submissions
            SET name = %s, phone = %s, email = %s, message = %s
            WHERE profile_token = %s
        ''', (name, phone, email, message, profile_token))
        
        connection.commit()
        return cursor.rowcount > 0
        
    except Error as e:
        print(f"Error updating submission: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def authenticate_user(login, password):
    """Аутентифицирует пользователя по логину и паролю"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute('''
            SELECT id, profile_token, name, phone, email, message, login, created_at, updated_at
            FROM contact_submissions
            WHERE login = %s
        ''', (login,))
        
        user = cursor.fetchone()
        
        if user and verify_password(password, user.get('password_hash', '')):
            # Удаляем хеш пароля из результата
            if 'password_hash' in user:
                del user['password_hash']
            return user
            
    except Error as e:
        print(f"Error authenticating user: {e}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
    
    return None


def get_all_submissions():
    """Получает все отправки форм (для администратора)"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute('''
            SELECT id, name, phone, email, message, login, created_at, updated_at
            FROM contact_submissions
            ORDER BY created_at DESC
        ''')
        
        return cursor.fetchall()
        
    except Error as e:
        print(f"Error getting all submissions: {e}")
        return []
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def delete_submission(submission_id):
    """Удаляет отправку формы по ID"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM contact_submissions WHERE id = %s', (submission_id,))
        connection.commit()
        return cursor.rowcount > 0
        
    except Error as e:
        print(f"Error deleting submission: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def validate_form_data(data, is_update=False):
    """
    Проверяет корректность заполнения обязательных полей
    Возвращает кортеж (is_valid, errors)
    """
    errors = []
    
    # Проверка имени
    name = data.get('name', '').strip()
    if not name:
        errors.append('Имя обязательно для заполнения')
    elif len(name) < 2 or len(name) > 255:
        errors.append('Имя должно быть от 2 до 255 символов')
    
    # Проверка телефона
    phone = data.get('phone', '').strip()
    if not phone:
        errors.append('Телефон обязателен для заполнения')
    elif len(phone) < 5:
        errors.append('Телефон слишком короткий')
    
    # Проверка email (необязательное поле, но если указано - должно быть корректным)
    email = data.get('email', '').strip()
    if email:
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            errors.append('Некорректный формат email')
    
    # Проверка сообщения (необязательное)
    message = data.get('message', '').strip()
    if message and len(message) > 10000:
        errors.append('Сообщение слишком длинное (максимум 10000 символов)')
    
    return len(errors) == 0, errors
