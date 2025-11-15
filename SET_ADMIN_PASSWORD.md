# Установка пароля для админ-панели

Есть несколько способов установить пароль для входа в админ-панель:

## Способ 1: Использование скрипта (Рекомендуется)

### Установить пароль существующему пользователю:

```bash
cd backend
npm run set-admin-password <email> <password>
```

**Пример:**
```bash
npm run set-admin-password admin@example.com mypassword123
```

### Создать нового администратора:

```bash
cd backend
npm run create-admin <email> <password> [telegramId]
```

**Пример:**
```bash
npm run create-admin admin@example.com mypassword123 123456789
```

**Примечание:** `telegramId` необязателен. Если не указан, будет использован 0.

## Способ 2: Через SQL запрос

Подключитесь к базе данных и выполните:

```sql
-- Обновить пароль существующего пользователя
UPDATE "User" 
SET "passwordHash" = crypt('your_password_here', gen_salt('bf', 10))
WHERE email = 'admin@example.com' 
  AND role IN ('ADMIN', 'MANAGER');
```

Или используйте bcrypt напрямую через Node.js:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your_password', 10);
// Используйте полученный hash в SQL запросе
```

## Способ 3: Через Prisma Studio

1. Запустите Prisma Studio:
```bash
cd backend
npx prisma studio
```

2. Найдите пользователя с ролью ADMIN или MANAGER
3. Обновите поле `email` (если нужно)
4. Для пароля нужно установить `passwordHash` - используйте способ 1 или 2

## Способ 4: Первый вход (автоматическое создание)

При первом входе через `/admin/login` пароль будет создан автоматически, если:
- Пользователь существует с нужным email
- У пользователя роль ADMIN или MANAGER
- Статус пользователя ACTIVE

## Требования к паролю

- Минимум 6 символов
- Рекомендуется использовать сложный пароль с буквами, цифрами и символами

## Проверка

После установки пароля попробуйте войти:
1. Откройте: `https://your-domain/admin/login`
2. Введите email и пароль
3. Вы должны быть перенаправлены в админ-панель

