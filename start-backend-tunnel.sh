#!/bin/bash

echo "🔗 Запуск Cloudflare Tunnel для Backend API"
echo ""

# Проверяем, запущен ли backend
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️  Backend не запущен на http://localhost:3000"
    echo "Запустите backend сначала:"
    echo "  cd backend && npm run dev"
    exit 1
fi

# Останавливаем старый туннель backend
pkill -f "cloudflared.*3000" 2>/dev/null
sleep 1

# Запускаем новый туннель для backend
echo "Запуск Cloudflare Tunnel для backend на порту 3000..."
cloudflared tunnel --url http://localhost:3000 2>&1 | tee /tmp/cloudflared-backend.log &
CLOUDFLARE_PID=$!

echo "Tunnel PID: $CLOUDFLARE_PID"
echo "Ожидание создания туннеля..."
sleep 8

# Получаем URL
BACKEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared-backend.log 2>/dev/null | head -1)

if [ -n "$BACKEND_URL" ]; then
    echo ""
    echo "✅ Backend туннель создан!"
    echo ""
    echo "🌐 Публичный HTTPS URL для Backend:"
    echo "   $BACKEND_URL"
    echo ""
    echo "📝 Обновите VITE_API_URL в frontend/.env:"
    echo "   VITE_API_URL=$BACKEND_URL"
    echo ""
    echo "Или экспортируйте переменную:"
    echo "   export VITE_API_URL=$BACKEND_URL"
    echo ""
    echo "Для остановки туннеля: kill $CLOUDFLARE_PID"
    echo "$BACKEND_URL" > /tmp/cloudflare_backend_url.txt
else
    echo ""
    echo "⚠️  Не удалось получить URL автоматически"
    echo "Проверьте логи: tail -f /tmp/cloudflared-backend.log"
fi

