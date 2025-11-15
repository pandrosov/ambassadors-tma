# Backend Dockerfile
# Railway использует этот файл когда Root Directory = backend
# ВАЖНО: Когда Root Directory = backend, Railway использует build context = корень репозитория
# Но Dockerfile находится в backend/, поэтому пути COPY должны быть относительно корня репозитория
FROM node:18-alpine AS builder

WORKDIR /app

# Railway копирует весь репозиторий в build context (корень проекта)
# Поэтому пути COPY должны быть относительно корня репозитория
# Копируем package.json из корня проекта
COPY package*.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Устанавливаем зависимости из корня проекта (workspaces)
# Используем npm install вместо npm ci для workspaces совместимости
RUN npm install --workspaces --legacy-peer-deps

# Копируем весь код
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
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/backend

# Railway автоматически устанавливает PORT через переменную окружения
# Приложение использует process.env.PORT || 3000
EXPOSE ${PORT:-3000}

CMD ["node", "dist/index.js"]
