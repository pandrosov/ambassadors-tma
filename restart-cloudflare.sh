#!/bin/bash

echo "🔄 Перезапуск Cloudflare Tunnel..."

# Останавливаем старые процессы
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 2

# Проверяем, что frontend запущен
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "⚠️  Frontend не запущен на http://localhost:5173"
    echo "Запустите frontend сначала: cd frontend && npm run dev"
    exit 1
fi

# Запускаем Cloudflare Tunnel для frontend
echo "🔗 Запуск Cloudflare Tunnel для frontend..."
cloudflared tunnel --url http://localhost:5173 > /tmp/cloudflared.log 2>&1 &
CLOUDFLARE_PID=$!
echo "Cloudflare Tunnel PID: $CLOUDFLARE_PID"

# Ожидание запуска туннеля
sleep 6

# Получаем публичный URL
CLOUDFLARE_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)

if [ -z "$CLOUDFLARE_URL" ]; then
    echo ""
    echo "⚠️  Не удалось получить Cloudflare URL автоматически"
    echo "Проверьте логи: tail -f /tmp/cloudflared.log"
    echo ""
    echo "Попробуйте запустить вручную:"
    echo "cloudflared tunnel --url http://localhost:5173"
else
    echo ""
    echo "✅ Cloudflare Tunnel запущен!"
    echo "🔗 Публичный URL: $CLOUDFLARE_URL"
    echo ""
    echo "Для остановки выполните:"
    echo "kill $CLOUDFLARE_PID"
    echo ""
    echo "Логи: tail -f /tmp/cloudflared.log"
fi

