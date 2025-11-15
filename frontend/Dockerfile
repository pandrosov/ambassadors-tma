# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json из корня для workspaces
COPY package*.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Устанавливаем зависимости из корня проекта (workspaces)
RUN npm install --workspaces

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

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

