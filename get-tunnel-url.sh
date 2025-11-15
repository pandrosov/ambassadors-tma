#!/bin/bash

echo "🔍 Поиск активного туннеля..."
echo ""

# Проверяем Cloudflare Tunnel
if ps aux | grep -q "[c]loudflared tunnel"; then
    CLOUDFLARE_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
    if [ -n "$CLOUDFLARE_URL" ]; then
        echo "✅ Cloudflare Tunnel активен!"
        echo ""
        echo "🌐 Публичный HTTPS URL:"
        echo "   $CLOUDFLARE_URL"
        echo ""
        echo "📱 Используйте этот URL в Telegram BotFather:"
        echo "   1. Откройте @BotFather"
        echo "   2. Выполните /newapp"
        echo "   3. Выберите вашего бота"
        echo "   4. Вставьте URL: $CLOUDFLARE_URL"
        exit 0
    fi
fi

# Проверяем ngrok
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
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
    
    if [ -n "$NGROK_URL" ]; then
        echo "✅ Ngrok активен!"
        echo ""
        echo "🌐 Публичный HTTPS URL:"
        echo "   $NGROK_URL"
        echo ""
        echo "📱 Используйте этот URL в Telegram BotFather"
        exit 0
    fi
fi

echo "⚠️  Активный туннель не найден!"
echo ""
echo "Запустите один из вариантов:"
echo ""
echo "1. Cloudflare Tunnel (рекомендуется):"
echo "   cloudflared tunnel --url https://localhost:5173"
echo ""
echo "2. Или используйте скрипт:"
echo "   ./start-with-cloudflare.sh"
echo ""
echo "После запуска выполните этот скрипт снова для получения URL"

