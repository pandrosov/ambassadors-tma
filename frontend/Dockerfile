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

# Railway может использовать переменную PORT, но nginx по умолчанию слушает на 80
# Если Railway требует другой порт, можно настроить через переменную окружения
EXPOSE ${PORT:-80}

# Если Railway устанавливает PORT, нужно настроить nginx на этот порт
# Для этого можно использовать envsubst или просто использовать порт 80
CMD ["nginx", "-g", "daemon off;"]

