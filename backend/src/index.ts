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

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.railway\.app$/,
    /\.up\.railway\.app$/,
    /\.trycloudflare\.com$/,
    /\.ngrok-free\.app$/,
    /\.ngrok\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Telegram-Id'],
}));
app.use(express.json());
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

