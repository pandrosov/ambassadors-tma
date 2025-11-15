# 🔧 Исправление проблемы CORS на Railway

## Проблема

CORS ошибка: `No 'Access-Control-Allow-Origin' header is present on the requested resource`

## Найденные проблемы:

1. **FRONTEND_URL без протокола**: В Railway Variables установлен `amb-frontend-production.up.railway.app` без `https://`
2. **Порядок middleware**: OPTIONS запросы могут не обрабатываться правильно

## Решение:

### 1. Исправьте FRONTEND_URL в Railway:

**Через Railway Dashboard:**
1. Откройте Railway Dashboard → Backend сервис (`amb-backend`) → Variables
2. Найдите переменную `FRONTEND_URL`
3. Измените значение на: `https://amb-frontend-production.up.railway.app`
4. Сохраните изменения

**Через Railway CLI:**
```bash
railway link
railway variables
# Выберите сервис amb-backend
# Найдите FRONTEND_URL и измените на: https://amb-frontend-production.up.railway.app
```

### 2. Проверьте, что код обновлен:

Код уже обновлен для автоматической нормализации `FRONTEND_URL` (добавление `https://` если отсутствует), но лучше установить правильное значение вручную.

### 3. Проверьте логи бэкенда:

```bash
railway logs --service amb-backend
```

Ищите сообщения:
- `[CORS] Preflight request from ...`
- `🚀 Server running on port 3000`

### 4. Проверьте работу после деплоя:

```bash
# Проверка CORS preflight
curl -X OPTIONS https://ambassadors-tma-production.up.railway.app/api/tasks/me \
  -H "Origin: https://amb-frontend-production.up.railway.app" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Должны быть заголовки:
# Access-Control-Allow-Origin: https://amb-frontend-production.up.railway.app
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, X-Telegram-Init-Data, X-Telegram-Id
```

## Дополнительная проверка:

Проверьте, что бэкенд запущен:
```bash
curl https://ambassadors-tma-production.up.railway.app/health
curl https://ambassadors-tma-production.up.railway.app/health/db
```

## Если проблема сохраняется:

1. Проверьте, что бэкенд перезапустился после изменения переменных
2. Проверьте логи на наличие ошибок CORS
3. Убедитесь, что домены совпадают точно (включая `https://`)

