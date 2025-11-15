# Backend Dockerfile
# Railway использует этот файл когда Root Directory = backend
# ВАЖНО: Railway всегда использует корень репозитория как build context
# Root Directory влияет только на поиск Dockerfile, но не на build context
FROM node:18-alpine AS builder

WORKDIR /app

# Railway копирует весь репозиторий в build context (корень проекта)
# Сначала копируем package.json файлы для установки зависимостей
COPY package*.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Устанавливаем зависимости из корня проекта (workspaces)
# Используем npm install вместо npm ci для workspaces совместимости
# Отключаем postinstall скрипты, так как Prisma schema еще не скопирован
RUN npm install --workspaces --legacy-peer-deps --ignore-scripts

# Теперь копируем весь код (после установки зависимостей для лучшего кеширования)
# Копируем директории из корня build context
COPY shared ./shared
COPY backend ./backend

# Генерируем Prisma Client и собираем проект
WORKDIR /app/backend
RUN npx prisma generate && npm run build

# Production образ
FROM node:18-alpine

# Устанавливаем OpenSSL для Prisma
# Prisma требует libssl.so.1.1 для работы в Alpine Linux
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app

# Копируем package.json для установки только production зависимостей
COPY package*.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Копируем собранный код
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Копируем Prisma Client и CLI из builder stage ПЕРЕД установкой production зависимостей
# Это гарантирует, что @prisma/engines не будет удален
RUN mkdir -p node_modules/.prisma node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Устанавливаем только production зависимости
# Отключаем postinstall скрипты, так как Prisma Client уже сгенерирован в builder stage
# Используем --no-audit для ускорения и --prefer-offline для использования кеша
RUN npm install --workspaces --omit=dev --legacy-peer-deps --ignore-scripts --no-audit --prefer-offline

WORKDIR /app/backend

# Railway автоматически устанавливает PORT через переменную окружения
# Приложение использует process.env.PORT || 3000
EXPOSE 3000

# Запускаем миграции Prisma перед запуском приложения
# Railway автоматически устанавливает DATABASE_URL
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
