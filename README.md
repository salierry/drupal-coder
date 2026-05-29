# Backend сервер для формы "Связь с нами"

Node.js + Express сервер с интеграцией MySQL/MariaDB для обработки формы обратной связи.

## Требования

- Node.js >= 18.x
- MySQL или MariaDB >= 10.x

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения:
```bash
cp .env.example .env
```

3. Отредактируйте `.env` файл с вашими параметрами базы данных:
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ваш_пароль
DB_NAME=drupal_coder_db
JWT_SECRET=ваш_секретный_ключ
COOKIE_SECRET=ваш_секретный_ключ_для_cookie
```

4. Создайте базу данных:
```sql
CREATE DATABASE drupal_coder_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Запуск

### Обычный режим:
```bash
npm start
```

### Режим разработки (с авто-перезагрузкой):
```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

## API Endpoints

### Форма обратной связи

#### POST /api/contact/submit
Отправка формы связи. Принимает JSON или XML.

**Request (JSON):**
```json
{
  "name": "Иван Иванов",
  "phone": "+7 (999) 123-45-67",
  "email": "ivan@example.com",
  "message": "Интересует поддержка сайта",
  "form_type": "footer_contact"
}
```

**Request (XML):**
```xml
<form>
  <name>Иван Иванов</name>
  <phone>+7 (999) 123-45-67</phone>
  <email>ivan@example.com</email>
  <message>Интересует поддержка сайта</message>
  <form_type>footer_contact</form_type>
</form>
```

**Response для нового пользователя:**
```json
{
  "success": true,
  "message": "Форма успешно отправлена. Сохраните ваши данные для входа:",
  "login": "user_a1b2c3d4",
  "password": "x9y8z7w6v5u4",
  "submissionId": 1,
  "profileUrl": "/profile/1"
}
```

**Response для авторизованного пользователя:**
```json
{
  "success": true,
  "message": "Форма успешно отправлена",
  "submissionId": 2,
  "profileUrl": "/profile/1"
}
```

#### GET /api/contact/submissions
Получить все отправки формы текущего пользователя (требуется авторизация).

**Response:**
```json
{
  "success": true,
  "submissions": [
    {
      "id": 1,
      "name": "Иван Иванов",
      "phone": "+7 (999) 123-45-67",
      "email": "ivan@example.com",
      "message": "Интересует поддержка сайта",
      "form_type": "footer_contact",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### PUT /api/contact/submissions/:id
Обновить существующую отправку формы (требуется авторизация).

**Request:**
```json
{
  "name": "Иван Иванов",
  "phone": "+7 (999) 123-45-67",
  "email": "newemail@example.com",
  "message": "Обновленное сообщение"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Данные успешно обновлены"
}
```

#### DELETE /api/contact/submissions/:id
Удалить отправку формы (требуется авторизация).

**Response:**
```json
{
  "success": true,
  "message": "Запись успешно удалена"
}
```

### Авторизация

#### POST /api/auth/login
Вход с использованием сгенерированных логина и пароля.

**Request:**
```json
{
  "login": "user_a1b2c3d4",
  "password": "x9y8z7w6v5u4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Вход выполнен успешно",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "login": "user_a1b2c3d4"
  },
  "profileUrl": "/profile/1"
}
```

#### POST /api/auth/logout
Выход из системы.

**Response:**
```json
{
  "success": true,
  "message": "Выход выполнен успешно"
}
```

#### GET /api/auth/me
Получить информацию о текущем пользователе (требуется авторизация).

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "login": "user_a1b2c3d4",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

## Валидация полей

Сервер проверяет корректность заполнения обязательных полей:

- **name** (обязательно): минимум 2 символа
- **phone** (обязательно): должен содержать не менее 10 цифр
- **email** (опционально): должен быть валидным email форматом
- **message** (опционально): если заполнено, минимум 5 символов

## Особенности

1. **Для неавторизованных пользователей**: при первой отправке формы автоматически создается новый пользователь с уникальными логином и паролем, которые возвращаются в ответе.

2. **Для авторизованных пользователей**: форма сохраняется в историю отправок, можно редактировать все поля кроме логина и пароля.

3. **Cookies**: токен авторизации сохраняется в httpOnly cookie на 30 дней.

4. **База данных**: каждая отправка формы создает отдельную строку в таблице `contact_forms`.

## Структура базы данных

### Таблица `users`
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- login (VARCHAR(100), UNIQUE, NOT NULL)
- password_hash (VARCHAR(255), NOT NULL)
- created_at (TIMESTAMP)

### Таблица `contact_forms`
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- user_id (INT, FOREIGN KEY -> users.id)
- name (VARCHAR(255), NOT NULL)
- phone (VARCHAR(50), NOT NULL)
- email (VARCHAR(255))
- message (TEXT)
- form_type (VARCHAR(100))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Интеграция с фронтендом (React)

Пример отправки формы с React:

```javascript
const submitForm = async (formData) => {
  const response = await fetch('http://localhost:3000/api/contact/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Для отправки cookies
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  
  if (result.success) {
    if (result.login && result.password) {
      // Новый пользователь - показать логин и пароль
      alert(`Ваши данные для входа:\nЛогин: ${result.login}\nПароль: ${result.password}`);
    }
  }
};
```
