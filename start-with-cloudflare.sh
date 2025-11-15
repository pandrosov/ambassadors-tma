#!/bin/bash

echo "🚀 Запуск серверов с Cloudflare Tunnel..."

# Запуск backend
echo "📦 Запуск backend на http://localhost:3000"
cd backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Ожидание запуска backend
sleep 3

# Запуск frontend
echo "🌐 Запуск frontend на https://localhost:5173"
cd ../frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Ожидание запуска frontend
sleep 5

# Запуск Cloudflare Tunnel
echo "🔗 Запуск Cloudflare Tunnel..."
pkill cloudflared 2>/dev/null
sleep 2
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
    echo "Или выполните вручную: cloudflared tunnel --url https://localhost:5173"
else
    echo ""
    echo "✅ Серверы запущены!"
    echo "📦 Backend: http://localhost:3000"
    echo "🌐 Frontend (локально): https://localhost:5173"
    echo "🔗 Frontend (публичный): $CLOUDFLARE_URL"
    echo ""
    echo "📱 Используйте этот URL для Telegram Mini Apps:"
    echo "   $CLOUDFLARE_URL"
    echo ""
    echo "Для остановки выполните:"
    echo "kill $BACKEND_PID $FRONTEND_PID $CLOUDFLARE_PID"
    echo ""
    echo "Логи:"
    echo "  Backend: tail -f /tmp/backend.log"
    echo "  Frontend: tail -f /tmp/frontend.log"
    echo "  Cloudflare: tail -f /tmp/cloudflared.log"
fi

# Сохраняем PIDs для остановки
echo "$BACKEND_PID $FRONTEND_PID $CLOUDFLARE_PID" > /tmp/ambassadors_pids.txt

