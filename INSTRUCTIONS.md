# Инструкция по настройке базы данных на хостинге вуза

## Ваши данные для доступа:
- **SSH**: `ssh u82290@kubsu-dev.ru -p 58528`
- **MySQL**: `mysql -u u82290 -p`
- **База данных**: `u82290` (или `u82290_db`)

## Шаг 1: Подключение к базе данных

### Вариант А: Через SSH (рекомендуется)
```bash
# Подключитесь по SSH
ssh u82290@kubsu-dev.ru -p 58528

# Введите пароль от вашей учетной записи

# После подключения войдите в MySQL
mysql -u u82290 -p

# Введите пароль от базы данных
```

### Вариант Б: Если MySQL доступен локально на сервере Node.js
Если ваш Node.js сервер работает на том же хосте, используйте параметры из `.env`

## Шаг 2: Создание таблиц в базе данных

После входа в MySQL выполните следующие команды:

```sql
-- Выбираем вашу базу данных
USE u82290;

-- Создаем таблицу пользователей
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Создаем таблицу для форм обратной связи
CREATE TABLE IF NOT EXISTS contact_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  message TEXT,
  form_type VARCHAR(100) DEFAULT 'footer_contact',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Проверяем создание таблиц
SHOW TABLES;

-- Выходим из MySQL
EXIT;
```

## Шаг 3: Настройка файла .env

Откройте файл `.env` в редакторе и замените `ВАШ_ПАРОЛЬ_ОТ_БД` на реальный пароль от вашей базы данных:

```env
# Порт сервера
PORT=3000

# Параметры подключения к базе данных вуза
DB_HOST=kubsu-dev.ru
DB_PORT=58528
DB_USER=u82290
DB_PASSWORD=ваш_реальный_пароль_от_бд
DB_NAME=u82290

# Секретные ключи (можно оставить как есть или изменить)
JWT_SECRET=super-secret-jwt-key-for-kubsu-project-2024
COOKIE_SECRET=cookie-secret-key-for-kubsu-project-2024
```

## Шаг 4: Запуск сервера

```bash
# Устанавливаем зависимости (если еще не установлены)
npm install

# Запускаем сервер
npm start
```

## Проверка работы

После запуска сервер должен быть доступен по адресу: `http://localhost:3000`

API эндпоинты:
- `POST /api/contact` - Отправка формы (создание нового пользователя)
- `POST /api/login` - Вход в систему
- `PUT /api/contact/:id` - Обновление данных формы (требуется авторизация)
- `GET /api/contact/:id` - Получение данных формы (требуется авторизация)

## Важные замечания

1. **Пароль от базы данных**: Используйте тот пароль, который вы получили от вуза или установили при создании базы данных.

2. **Имя базы данных**: На хостингах обычно база данных имеет имя вида `u82290_db` или просто `u82290`. Уточните точное имя в панели управления хостингом.

3. **Безопасность**: 
   - Не коммитьте файл `.env` в git (он уже добавлен в `.gitignore`)
   - Смените секретные ключи JWT_SECRET и COOKIE_SECRET на уникальные значения

4. **Если таблицы не создаются**: Убедитесь, что у пользователя `u82290` есть права на создание таблиц в базе данных.
