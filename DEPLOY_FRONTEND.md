# Деплой Frontend на Vercel

## 🚀 Быстрый старт

### Шаг 1: Подготовка

1. Убедитесь, что backend уже задеплоен на Railway
2. Получите URL вашего Railway backend (например: `https://your-app.up.railway.app`)

### Шаг 2: Деплой на Vercel

#### Вариант 1: Через веб-интерфейс (рекомендуется)

1. Перейдите на [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. Нажмите "Add New Project"
4. Выберите репозиторий `pandrosov/ambassadors-tma`
5. В настройках проекта:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Добавьте переменные окружения:
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app
   ```
7. Нажмите "Deploy"

#### Вариант 2: Через Vercel CLI

```bash
# Установите Vercel CLI
npm install -g vercel

# Войдите в Vercel
vercel login

# Перейдите в директорию frontend
cd frontend

# Деплой
vercel

# Установите переменные окружения
vercel env add VITE_API_URL production
# Введите URL вашего Railway backend
```

### Шаг 3: Настройка переменных окружения

В Vercel Dashboard → Settings → Environment Variables добавьте:

```
VITE_API_URL=https://your-railway-backend.up.railway.app
```

### Шаг 4: Обновление Telegram Bot

После деплоя получите URL вашего Vercel приложения (например: `https://your-app.vercel.app`)

Обновите Web App URL в вашем Telegram боте:
1. Откройте [@BotFather](https://t.me/botfather)
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите "Bot Settings" → "Menu Button"
5. Установите URL: `https://your-app.vercel.app`

## 📋 Структура деплоя

- **Backend**: Railway (Node.js + Express)
- **Frontend**: Vercel (React + Vite)
- **Database**: Railway PostgreSQL

## 🔧 Настройка CORS

Убедитесь, что в backend настроен CORS для вашего Vercel домена:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'https://your-app.vercel.app/*'
  ],
  credentials: true
}));
```

## ✅ Проверка

После деплоя проверьте:
1. Frontend доступен по Vercel URL
2. API запросы идут на Railway backend
3. Telegram Mini App открывается в боте
4. Все функции работают корректно

