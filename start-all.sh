#!/bin/bash

echo "🚀 Запуск всех серверов с туннелями"
echo ""

# 1. Запуск Backend
echo "📦 Запуск Backend..."
cd backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# 2. Запуск Frontend
echo "🌐 Запуск Frontend..."
cd ../frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 5

# 3. Запуск туннеля для Frontend
echo "🔗 Запуск Cloudflare Tunnel для Frontend..."
pkill -f "cloudflared.*5173" 2>/dev/null
cloudflared tunnel --url http://localhost:5173 > /tmp/cloudflared-frontend.log 2>&1 &
FRONTEND_TUNNEL_PID=$!
echo "Frontend Tunnel PID: $FRONTEND_TUNNEL_PID"
sleep 8

# 4. Запуск туннеля для Backend
echo "🔗 Запуск Cloudflare Tunnel для Backend..."
pkill -f "cloudflared.*3000" 2>/dev/null
cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared-backend.log 2>&1 &
BACKEND_TUNNEL_PID=$!
echo "Backend Tunnel PID: $BACKEND_TUNNEL_PID"
sleep 8

# Получаем URLs
FRONTEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared-frontend.log 2>/dev/null | head -1)
BACKEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared-backend.log 2>/dev/null | head -1)

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ -n "$FRONTEND_URL" ] && [ -n "$BACKEND_URL" ]; then
    echo "✅ Все серверы запущены!"
    echo ""
    echo "🌐 Frontend (публичный):"
    echo "   $FRONTEND_URL"
    echo ""
    echo "🌐 Backend (публичный):"
    echo "   $BACKEND_URL"
    echo ""
    echo "📝 Обновляю frontend/.env..."
    echo "VITE_API_URL=$BACKEND_URL" > frontend/.env
    echo "✅ Frontend настроен на использование публичного backend URL"
    echo ""
    echo "📱 Используйте Frontend URL в Telegram BotFather:"
    echo "   $FRONTEND_URL"
    echo ""
    echo "Для остановки выполните:"
    echo "kill $BACKEND_PID $FRONTEND_PID $FRONTEND_TUNNEL_PID $BACKEND_TUNNEL_PID"
    echo ""
    echo "Логи:"
    echo "  Backend: tail -f /tmp/backend.log"
    echo "  Frontend: tail -f /tmp/frontend.log"
    echo "  Frontend Tunnel: tail -f /tmp/cloudflared-frontend.log"
    echo "  Backend Tunnel: tail -f /tmp/cloudflared-backend.log"
    
    # Сохраняем URLs
    echo "$FRONTEND_URL" > /tmp/cloudflare_frontend_url.txt
    echo "$BACKEND_URL" > /tmp/cloudflare_backend_url.txt
else
    echo "⚠️  Не все туннели созданы"
    if [ -z "$FRONTEND_URL" ]; then
        echo "Frontend туннель не создан. Проверьте: tail -f /tmp/cloudflared-frontend.log"
    fi
    if [ -z "$BACKEND_URL" ]; then
        echo "Backend туннель не создан. Проверьте: tail -f /tmp/cloudflared-backend.log"
    fi
fi
echo "═══════════════════════════════════════════════════════════"

