#!/bin/bash

echo "🚀 Запуск серверов..."

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

echo ""
echo "✅ Серверы запущены!"
echo "📦 Backend: http://localhost:3000"
echo "🌐 Frontend: https://localhost:5173"
echo ""
echo "Для остановки выполните:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Логи backend: tail -f /tmp/backend.log"
echo "Логи frontend: tail -f /tmp/frontend.log"

# Сохраняем PIDs для остановки
echo "$BACKEND_PID $FRONTEND_PID" > /tmp/ambassadors_pids.txt
