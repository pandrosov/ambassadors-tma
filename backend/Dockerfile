# Backend Dockerfile
# Railway использует этот файл когда Root Directory = backend
# ВАЖНО: Railway копирует весь репозиторий в build context (корень проекта)
# Но Dockerfile находится в backend/, поэтому пути COPY должны быть относительно корня
FROM node:18-alpine AS builder

WORKDIR /app

# Railway копирует весь репозиторий, поэтому build context = корень проекта
# Сначала копируем package.json файлы для установки зависимостей
COPY package*.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Устанавливаем зависимости из корня проекта (workspaces)
# Используем npm install вместо npm ci для workspaces совместимости
RUN npm install --workspaces --legacy-peer-deps

# Теперь копируем весь код (после установки зависимостей для лучшего кеширования)
COPY shared ./shared
COPY backend ./backend

# Генерируем Prisma Client и собираем проект
WORKDIR /app/backend
RUN npm run build

# Production образ
FROM node:18-alpine

WORKDIR /app

# Копируем package.json для установки только production зависимостей
COPY package*.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Устанавливаем только production зависимости
RUN npm install --workspaces --omit=dev --legacy-peer-deps

# Копируем собранный код
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

WORKDIR /app/backend

# Railway автоматически устанавливает PORT через переменную окружения
# Приложение использует process.env.PORT || 3000
EXPOSE ${PORT:-3000}

CMD ["node", "dist/index.js"]
