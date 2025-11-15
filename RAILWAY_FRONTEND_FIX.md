# Исправление проблемы с путями в Railway Frontend

## Проблема

Когда Root Directory установлен в `frontend`, команда `cd ..` переходит в корень контейнера (`/`), где нет `package.json`.

Ошибка:
```
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/package.json'
```

## Решение 1: Использование RAILWAY_WORKSPACE_ROOT (текущее)

Используется переменная `$RAILWAY_WORKSPACE_ROOT`, которая указывает на корень проекта.

**Конфигурация:**
- Root Directory: `frontend`
- Build Command: `cd $RAILWAY_WORKSPACE_ROOT && npm install --workspaces && cd frontend && npm run build`
- Start Command: `cd $RAILWAY_WORKSPACE_ROOT/frontend && npx serve -s dist -l $PORT`

## Решение 2: Изменить Root Directory на корень проекта

Если `$RAILWAY_WORKSPACE_ROOT` не работает, можно изменить Root Directory:

**В Railway Settings:**
- Root Directory: `.` (корень проекта) или оставить пустым

**Обновить frontend/railway.json:**
```json
{
  "build": {
    "buildCommand": "npm install --workspaces && npm run build --workspace=frontend"
  },
  "deploy": {
    "startCommand": "cd frontend && npx serve -s dist -l $PORT"
  }
}
```

**Обновить frontend/nixpacks.toml:**
```toml
[phases.install]
cmds = ["npm install --workspaces"]

[phases.build]
cmds = ["npm run build --workspace=frontend"]

[start]
cmd = "cd frontend && npx serve -s dist -l $PORT"
```

## Проверка

После исправления:
1. Railway должен найти `package.json` в корне проекта
2. Установить все зависимости из workspaces
3. Собрать фронтенд
4. Запустить сервер

## Логи для проверки

Успешная установка:
```
npm install --workspaces
added XXX packages
```

Успешная сборка:
```
vite build
dist/index.html
```

Успешный запуск:
```
serve -s dist -l 3000
```

