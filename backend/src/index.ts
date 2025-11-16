import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import usersRouter from './routes/users.js';
import tasksRouter from './routes/tasks.js';
import reportsRouter from './routes/reports.js';
import flarikiRouter from './routes/flariki.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import statisticsRouter from './routes/statistics.js';
import shopRouter from './routes/shop.js';
import productsRouter from './routes/products.js';
import { setupWeeklyJobs } from './cron/weeklyJobs.js';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const prisma = new PrismaClient();
// Railway автоматически устанавливает PORT через переменную окружения
// По умолчанию используем 3000, но Railway может установить другой порт
const PORT = process.env.PORT || 3000;

// Middleware для логирования запросов (только в development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      origin: req.headers.origin,
      'x-telegram-init-data': req.headers['x-telegram-init-data'] ? 'present' : 'missing',
      'x-telegram-id': req.headers['x-telegram-id'],
    });
    next();
  });
}

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Разрешаем запросы без origin (например, мобильные приложения или Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Нормализуем FRONTEND_URL (добавляем https:// если отсутствует)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const normalizedFrontendUrl = frontendUrl.startsWith('http') 
      ? frontendUrl 
      : `https://${frontendUrl}`;

    const allowedOrigins = [
      normalizedFrontendUrl,
      frontendUrl, // Также проверяем оригинальный URL на случай если уже с протоколом
      'http://localhost:5173',
      /\.railway\.app$/,
      /\.up\.railway\.app$/,
      /\.trycloudflare\.com$/,
      /\.ngrok-free\.app$/,
      /\.ngrok\.app$/,
    ];

    // Проверяем точное совпадение или регулярные выражения
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Разрешаем для отладки, в production можно вернуть ошибку
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Telegram-Id'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 часа
};

// CORS middleware ДОЛЖЕН быть ПЕРВЫМ после базовых настроек
// Это критически важно для правильной обработки preflight запросов
app.use(cors(corsOptions));

// Логирование всех запросов для отладки CORS (в production тоже)
app.use((req, res, next) => {
  // Логируем все запросы для отладки
  console.log(`[REQUEST] ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    method: req.method,
    headers: {
      'access-control-request-method': req.headers['access-control-request-method'],
      'access-control-request-headers': req.headers['access-control-request-headers'],
    }
  });
  
  // Логируем ответные заголовки CORS для OPTIONS запросов
  if (req.method === 'OPTIONS') {
    res.on('finish', () => {
      console.log(`[CORS DEBUG] OPTIONS response`, {
        statusCode: res.statusCode,
        headers: {
          'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
          'access-control-allow-methods': res.getHeader('access-control-allow-methods'),
          'access-control-allow-headers': res.getHeader('access-control-allow-headers'),
        }
      });
    });
  }
  
  next();
});

app.use(express.json());

// Middleware для преобразования BigInt в строку при сериализации JSON
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const jsonString = JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonString);
    return res;
  };
  next();
});

app.use(express.urlencoded({ extended: true }));

// Статические файлы для загруженных скриншотов
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      tables: tables.map(t => t.table_name),
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/flariki', flarikiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/shop', shopRouter);
app.use('/api/products', productsRouter);

// Telegram Webhook
app.post('/webhook/telegram', async (req, res) => {
  // TODO: обработка webhook от Telegram
  res.json({ ok: true });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Запускаем еженедельные задачи
  setupWeeklyJobs();
});

export { app, prisma };

