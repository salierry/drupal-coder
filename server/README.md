# Веб-сервис для обработки формы "Связь с нами"

## Требования

- Python 3.8+
- MySQL/MariaDB сервер
- Зависимости Python: fastapi, uvicorn, mysql-connector-python, bcrypt, python-multipart

## Установка зависимостей

```bash
pip install fastapi uvicorn mysql-connector-python bcrypt python-multipart
```

## Настройка базы данных

1. Создайте базу данных MySQL/MariaDB:
```sql
CREATE DATABASE contact_forms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Отредактируйте файл `config.py` или установите переменные окружения:
- `DB_HOST` - хост базы данных (по умолчанию: localhost)
- `DB_PORT` - порт базы данных (по умолчанию: 3306)
- `DB_USER` - пользователь БД (по умолчанию: root)
- `DB_PASSWORD` - пароль БД (по умолчанию: root)
- `DB_NAME` - имя базы данных (по умолчанию: contact_forms)

## Настройка администратора

Установите переменные окружения или отредактируйте `config.py`:
- `ADMIN_USERNAME` - логин администратора (по умолчанию: admin)
- `ADMIN_PASSWORD` - пароль администратора (по умолчанию: admin123)

## Запуск сервера

```bash
cd server
python main.py
```

Или через uvicorn напрямую:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Сервер будет доступен по адресу: http://localhost:8000

## API Endpoints

### POST /api/contact
Отправка формы связи. Принимает JSON или XML.

**Пример запроса (JSON):**
```json
{
    "name": "Иван Иванов",
    "phone": "+7 (999) 123-45-67",
    "email": "ivan@example.com",
    "message": "Здравствуйте, у меня вопрос..."
}
```

**Пример запроса (XML):**
```xml
<contact>
    <name>Иван Иванов</name>
    <phone>+7 (999) 123-45-67</phone>
    <email>ivan@example.com</email>
    <message>Здравствуйте, у меня вопрос...</message>
</contact>
```

**Ответ:**
```json
{
    "success": true,
    "message": "Форма успешно отправлена",
    "login": "user_abc12345",
    "password": "SecurePass123!",
    "profile_url": "/profile/abc123token",
    "submission_id": 1
}
```

### GET /profile/{profile_token}
Страница профиля пользователя для просмотра и редактирования данных.

### PUT /api/profile/{profile_token}
Обновление данных профиля (кроме логина и пароля).

### POST /api/login
Вход пользователя по логину и паролю.

**Пример запроса:**
```json
{
    "login": "user_abc12345",
    "password": "SecurePass123!"
}
```

### GET /admin
Админ-панель с HTTP Basic Auth авторизацией.
Требует заголовок Authorization: Basic base64(username:password)

### DELETE /api/admin/submission/{id}
Удаление записи администратором.

### GET /api/admin/submissions
Получение всех записей администратором (JSON API).

## Функциональность

1. **Для неавторизованных пользователей:**
   - Отправка формы "Связь с нами"
   - Получение автоматически сгенерированных логина и пароля
   - Получение ссылки на профиль

2. **Для авторизованных пользователей:**
   - Просмотр своих данных в профиле
   - Редактирование всех данных кроме логина и пароля
   - Вход по логину и паролю

3. **Для администратора:**
   - HTTP Basic Auth авторизация
   - Просмотр всех отправленных форм
   - Удаление записей
   - API для управления данными

4. **Валидация:**
   - Обязательные поля: имя, телефон
   - Опциональные поля: email, сообщение
   - Проверка формата email
   - Проверка длины полей

5. **Безопасность:**
   - Хранение хеша пароля (bcrypt)
   - Cookies для сессий
   - HTTP Basic Auth для админки

## Интеграция с фронтендом

Фронтенд автоматически отправляет данные формы на `/api/contact` и отображает полученные учетные данные пользователю.
