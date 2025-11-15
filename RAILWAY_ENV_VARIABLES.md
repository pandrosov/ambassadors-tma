# Переменные окружения для Railway

## 🔵 Backend сервис

### Обязательные переменные:

```bash
# База данных (создается автоматически Railway, но можно указать свою)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Telegram Bot API
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# JWT секрет для админ-панели
JWT_SECRET=your_very_long_and_random_secret_key_here

# Порт (Railway устанавливает автоматически через $PORT)
PORT=3000

# Окружение
NODE_ENV=production
```

### Опциональные переменные:

```bash
# URL фронтенда (для CORS)
FRONTEND_URL=https://your-frontend-url.railway.app

# Google Sheets API (если используется синхронизация)
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Telegram Webhook URL (если используется webhook вместо polling)
TELEGRAM_WEBHOOK_URL=https://your-backend-url.railway.app/webhook/telegram
```

---

## 🟢 Frontend сервис

### Обязательные переменные:

```bash
# URL бэкенда
VITE_API_URL=https://your-backend-url.railway.app

# Порт (Railway устанавливает автоматически через $PORT)
PORT=80
```

### Опциональные переменные:

```bash
# Окружение
NODE_ENV=production
```

---

## 📋 Инструкция по настройке в Railway:

### 1. Backend сервис:

1. Откройте настройки сервиса `backend` в Railway
2. Перейдите в раздел **Variables**
3. Добавьте следующие переменные:
   - `DATABASE_URL` - будет создана автоматически при добавлении PostgreSQL сервиса
   - `TELEGRAM_BOT_TOKEN` - получите у [@BotFather](https://t.me/BotFather) в Telegram
   - `JWT_SECRET` - сгенерируйте случайную строку (минимум 32 символа)
   - `NODE_ENV=production`
   - `PORT=3000` - ⚠️ **ВАЖНО:** Явно установите порт 3000, чтобы он совпадал с настройками Networking
   - `FRONTEND_URL` - URL вашего фронтенд сервиса (например: `https://amb-frontend-production.up.railway.app`)
     - ⚠️ **ВАЖНО:** Укажите точный URL фронтенда, включая поддомен и домен Railway

### 2. Frontend сервис:

1. Откройте настройки сервиса `frontend` в Railway
2. Перейдите в раздел **Variables**
3. Добавьте переменную:
   - `VITE_API_URL` - URL вашего бэкенд сервиса (например: `https://ambassadors-backend.railway.app`)

### 3. Shared Variables (для обоих сервисов):

Если переменные одинаковые для обоих сервисов, можно использовать **Shared Variables**:

1. В Railway Dashboard выберите проект
2. Перейдите в **Variables** → **Shared Variables**
3. Добавьте общие переменные (например, `NODE_ENV`)

---

## 🔐 Генерация JWT_SECRET:

```bash
# В терминале выполните:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Или используйте онлайн генератор: https://randomkeygen.com/

---

## 📝 Пример заполнения:

### Backend:
```
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
NODE_ENV=production
FRONTEND_URL=https://ambassadors-frontend.railway.app
PORT=3000
```

### Frontend:
```
VITE_API_URL=https://ambassadors-backend.railway.app
PORT=80
```

---

## ⚠️ Важные замечания:

1. **DATABASE_URL** - Railway автоматически создает PostgreSQL и устанавливает эту переменную. Не нужно заполнять вручную, если используете Railway PostgreSQL.

2. **VITE_API_URL** - Должен быть полный URL с `https://`. Railway предоставляет домен вида `your-service-name.railway.app`.

3. **FRONTEND_URL** - Используется для CORS на бэкенде. Должен совпадать с URL фронтенд сервиса.

4. После добавления переменных Railway автоматически перезапустит сервисы.

5. Для получения URL сервисов:
   - Откройте сервис в Railway Dashboard
   - Перейдите на вкладку **Settings**
   - Найдите раздел **Networking** → **Public Domain**
   - Скопируйте URL

