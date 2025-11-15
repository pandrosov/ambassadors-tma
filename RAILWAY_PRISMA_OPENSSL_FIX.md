# 🔧 Исправление проблемы с Prisma и OpenSSL на Railway

## Проблема

При деплое бэкенда на Railway возникала ошибка:
```
PrismaClientInitializationError: Unable to require(`/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node`).
Error loading shared library libssl.so.1.1: No such file or directory
```

## Причина

Alpine Linux образ (`node:18-alpine`) не содержит библиотеку OpenSSL 1.1, которая требуется для работы Prisma Query Engine.

## Решение

В `backend/Dockerfile` добавлена установка OpenSSL:

```dockerfile
# Production образ
FROM node:18-alpine

# Устанавливаем OpenSSL для Prisma
# Prisma требует libssl.so.1.1 для работы в Alpine Linux
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app
```

## Проверка после деплоя

1. Проверьте логи бэкенда на Railway:
   - Railway Dashboard → Backend сервис → Deployments → View Logs
   - Убедитесь, что нет ошибок с Prisma
   - Должно быть сообщение: `🚀 Server running on port XXXX`

2. Проверьте, что сервер запускается:
   - Откройте URL бэкенда: `https://ambassadors-tma-production.up.railway.app/health`
   - Должен вернуться JSON: `{"status":"ok","timestamp":"..."}`

3. Проверьте CORS:
   - Откройте фронтенд: `https://amb-frontend-production.up.railway.app`
   - Ошибки CORS должны исчезнуть

## Дополнительные заметки

- Railway автоматически устанавливает переменную `PORT` через переменные окружения
- Приложение использует `process.env.PORT || 3000`
- Убедитесь, что в Railway настройках порт установлен правильно (обычно 3000)

