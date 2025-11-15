# Root Dockerfile для фронтенда
# Railway будет использовать этот файл, если Root Directory = . (корень проекта)
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json из корня для workspaces
COPY package*.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Устанавливаем зависимости из корня проекта (workspaces)
# Используем npm install вместо npm ci для workspaces совместимости
RUN npm install --workspaces --legacy-peer-deps

# Копируем весь код
COPY shared ./shared
COPY frontend ./frontend

# Собираем frontend
WORKDIR /app/frontend
RUN npm run build

# Production образ с nginx для статических файлов
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Railway автоматически устанавливает PORT через переменную окружения
# nginx будет слушать на порту из переменной PORT или 80 по умолчанию
EXPOSE ${PORT:-80}

CMD ["nginx", "-g", "daemon off;"]

