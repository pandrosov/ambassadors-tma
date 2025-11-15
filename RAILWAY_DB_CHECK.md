# 🔍 Проверка подключения к базе данных на Railway

## Способ 1: Railway CLI (РЕКОМЕНДУЕТСЯ)

### Установка Railway CLI:
```bash
npm i -g @railway/cli
railway login
```

### Подключение к проекту:
```bash
railway link
# Выберите ваш проект
```

### Проверка подключения к базе данных:

1. **Подключиться к PostgreSQL через Railway CLI:**
```bash
railway run --service <your-postgres-service-name> psql $DATABASE_URL
```

Или если DATABASE_URL уже установлен:
```bash
railway run --service backend psql $DATABASE_URL
```

2. **Проверить список таблиц:**
```sql
\dt
```

3. **Проверить структуру таблицы:**
```sql
\d "User"
\d "Task"
\d "Report"
```

4. **Проверить количество записей:**
```sql
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Task";
SELECT COUNT(*) FROM "Report";
```

5. **Выйти из psql:**
```sql
\q
```

## Способ 2: Prisma Studio (локально)

### Подключиться к Railway базе данных локально:

1. **Установите переменную окружения DATABASE_URL локально:**
```bash
# Скопируйте DATABASE_URL из Railway Dashboard → PostgreSQL сервис → Variables
export DATABASE_URL="postgresql://user:password@host:port/railway"
```

2. **Запустите Prisma Studio:**
```bash
cd backend
npx prisma studio
```

3. **Откройте браузер:** http://localhost:5555

## Способ 3: Prisma CLI команды

### Проверить подключение:
```bash
cd backend
railway run --service backend npx prisma db pull
```

### Проверить статус миграций:
```bash
railway run --service backend npx prisma migrate status
```

### Выполнить миграции (если нужно):
```bash
railway run --service backend npx prisma migrate deploy
```

## Способ 4: Через код (health check endpoint)

Добавьте endpoint для проверки базы данных в `backend/src/index.ts`:

```typescript
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});
```

Затем проверьте:
```bash
curl https://ambassadors-tma-production.up.railway.app/health/db
```

## Проверка таблиц через SQL:

После подключения через `railway run psql`, выполните:

```sql
-- Список всех таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Проверка конкретных таблиц Prisma
SELECT * FROM "_prisma_migrations";
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Task";
SELECT COUNT(*) FROM "Report";
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "FlarikiTransaction";
```

## Типичные проблемы:

1. **База данных не подключена:**
   - Проверьте `DATABASE_URL` в Railway Variables
   - Убедитесь, что PostgreSQL сервис запущен

2. **Таблицы отсутствуют:**
   - Выполните миграции: `railway run --service backend npx prisma migrate deploy`

3. **Ошибки подключения:**
   - Проверьте, что DATABASE_URL правильный
   - Убедитесь, что база данных доступна из бэкенд сервиса

