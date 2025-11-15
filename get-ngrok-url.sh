#!/bin/bash

echo "🔍 Получение ngrok URL..."
echo ""

# Проверяем, запущен ли ngrok
if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "⚠️  Ngrok не запущен!"
    echo ""
    echo "Запустите ngrok в отдельном терминале:"
    echo "  ngrok http 5173"
    echo ""
    echo "Или используйте скрипт:"
    echo "  ./start-with-tunnel.sh"
    exit 1
fi

# Получаем URL
URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('tunnels'):
        for tunnel in data['tunnels']:
            if tunnel['proto'] == 'https':
                print(tunnel['public_url'])
                break
except:
    pass
" 2>/dev/null)

if [ -z "$URL" ]; then
    echo "⏳ Туннель еще создается..."
    echo "Откройте http://localhost:4040 в браузере"
else
    echo "✅ Публичный HTTPS URL:"
    echo ""
    echo "   $URL"
    echo ""
    echo "📱 Используйте этот URL в Telegram BotFather:"
    echo "   1. Откройте @BotFather"
    echo "   2. Выполните /newapp"
    echo "   3. Выберите вашего бота"
    echo "   4. Вставьте URL: $URL"
    echo ""
    echo "🌐 Откройте в браузере для проверки:"
    echo "   $URL"
fi

