#!/bin/bash

echo "🚀 Запуск серверов с ngrok туннелем..."

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

# Запуск ngrok
echo "🔗 Запуск ngrok туннеля..."
pkill ngrok 2>/dev/null
ngrok http 5173 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "Ngrok PID: $NGROK_PID"

# Ожидание запуска ngrok
sleep 5

# Получаем публичный URL
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PUBLIC_URL" ]; then
    echo ""
    echo "⚠️  Не удалось получить ngrok URL автоматически"
    echo "Проверьте: http://localhost:4040"
    echo "Или выполните: curl http://localhost:4040/api/tunnels"
else
    echo ""
    echo "✅ Серверы запущены!"
    echo "📦 Backend: http://localhost:3000"
    echo "🌐 Frontend (локально): https://localhost:5173"
    echo "🔗 Frontend (публичный): $PUBLIC_URL"
    echo ""
    echo "📱 Используйте этот URL для Telegram Mini Apps:"
    echo "   $PUBLIC_URL"
    echo ""
    echo "Для остановки выполните:"
    echo "kill $BACKEND_PID $FRONTEND_PID $NGROK_PID"
    echo ""
    echo "Логи:"
    echo "  Backend: tail -f /tmp/backend.log"
    echo "  Frontend: tail -f /tmp/frontend.log"
    echo "  Ngrok: tail -f /tmp/ngrok.log"
    echo "  Ngrok UI: http://localhost:4040"
fi

# Сохраняем PIDs для остановки
echo "$BACKEND_PID $FRONTEND_PID $NGROK_PID" > /tmp/ambassadors_pids.txt

