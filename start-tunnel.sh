#!/bin/bash

echo "🔗 Запуск Cloudflare Tunnel для Telegram Mini App"
echo ""

# Проверяем, запущен ли frontend (проверяем оба протокола)
if ! curl -s http://localhost:5173 > /dev/null 2>&1 && ! curl -k -s https://localhost:5173 > /dev/null 2>&1; then
    echo "⚠️  Frontend не запущен на localhost:5173"
    echo "Запустите frontend сначала:"
    echo "  cd frontend && npm run dev"
    exit 1
fi

# Останавливаем старый туннель
pkill cloudflared 2>/dev/null
sleep 1

# Запускаем новый туннель
echo "Запуск Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:5173 2>&1 | tee /tmp/cloudflared.log &
CLOUDFLARE_PID=$!

echo "Tunnel PID: $CLOUDFLARE_PID"
echo "Ожидание создания туннеля..."
sleep 8

# Получаем URL
CLOUDFLARE_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)

if [ -n "$CLOUDFLARE_URL" ]; then
    echo ""
    echo "✅ Туннель создан!"
    echo ""
    echo "🌐 Публичный HTTPS URL:"
    echo "   $CLOUDFLARE_URL"
    echo ""
    echo "📱 Используйте этот URL в Telegram BotFather:"
    echo "   1. Откройте @BotFather"
    echo "   2. Выполните /newapp"
    echo "   3. Выберите вашего бота"
    echo "   4. Вставьте URL: $CLOUDFLARE_URL"
    echo ""
    echo "🌐 Проверьте в браузере: $CLOUDFLARE_URL"
    echo ""
    echo "Для остановки туннеля: kill $CLOUDFLARE_PID"
    echo "$CLOUDFLARE_URL" > /tmp/cloudflare_url.txt
else
    echo ""
    echo "⚠️  Не удалось получить URL автоматически"
    echo "Проверьте логи: tail -f /tmp/cloudflared.log"
    echo "Или откройте терминал и запустите вручную:"
    echo "  cloudflared tunnel --url http://localhost:5173"
fi

