# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json из корня для workspaces
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

