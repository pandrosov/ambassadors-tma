#!/bin/bash

# Скрипт для деплоя на Railway
# Использование: ./deploy-railway.sh

set -e

echo "🚀 Railway Deployment Script"
echo ""

# Проверка установки Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен"
    echo "Установите: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI установлен: $(railway --version)"
echo ""

# Проверка логина
echo "🔐 Проверка авторизации..."
if ! railway whoami &> /dev/null; then
    echo "⚠️  Вы не авторизованы в Railway"
    echo "Выполните: railway login"
    exit 1
fi

echo "✅ Авторизован как: $(railway whoami)"
echo ""

# Проверка проекта
echo "📦 Проверка проекта..."
if [ ! -f "railway.json" ]; then
    echo "❌ Файл railway.json не найден"
    exit 1
fi

if [ ! -f "Procfile" ]; then
    echo "❌ Файл Procfile не найден"
    exit 1
fi

echo "✅ Конфигурационные файлы найдены"
echo ""

# Проверка подключения к проекту
echo "🔍 Проверка подключения к Railway проекту..."
if railway status &> /dev/null; then
    echo "✅ Проект уже подключен"
else
    echo "⚠️  Проект не подключен"
    echo "Выберите действие:"
    echo "1. Создать новый проект"
    echo "2. Подключить существующий проект"
    read -p "Введите номер (1 или 2): " choice
    
    if [ "$choice" == "1" ]; then
        echo "Создание нового проекта..."
        railway init
    elif [ "$choice" == "2" ]; then
        echo "Подключение к существующему проекту..."
        railway link
    else
        echo "❌ Неверный выбор"
        exit 1
    fi
fi

echo ""
echo "📋 Информация о проекте:"
railway status
echo ""

# Деплой
echo "🚀 Начинаю деплой..."
railway up

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Проверьте логи: railway logs"
echo "2. Настройте переменные окружения: railway variables"
echo "3. Создайте PostgreSQL базу данных: railway add postgresql"
echo "4. Примените миграции: railway run prisma migrate deploy"
echo ""

