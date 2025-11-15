import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateToken, verifyToken } from '../lib/jwt.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Создание первого администратора (только если в базе нет админов)
router.post('/admin/create-first', async (req, res) => {
  try {
    // Проверяем, есть ли уже администраторы
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount > 0) {
      return res.status(403).json({ 
        error: 'Администратор уже существует. Используйте обычный вход.' 
      });
    }

    const data = loginSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const admin = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        telegramId: 0,
        flarikiBalance: 0,
        firstName: 'Admin',
        lastName: 'User',
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    const token = generateToken({
      userId: admin.id,
      role: admin.role,
    });

    res.status(201).json({
      message: 'Первый администратор успешно создан!',
      token,
      user: admin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create first admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Вход для админ-панели
router.post('/admin/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    // Ищем пользователя по email (для админов/менеджеров)
    const user = await prisma.user.findFirst({
      where: {
        email: data.email,
        role: {
          in: ['ADMIN', 'MANAGER'],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем пароль (если есть passwordHash)
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(data.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
    } else {
      // Если пароля нет, создаем его (первый вход)
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Аккаунт неактивен' });
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ошибка валидации', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// Проверка токена
router.get('/admin/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Admin /me] No authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    console.log('[Admin /me] Verifying token...');
    
    const payload = verifyToken(token);

    if (!payload) {
      console.log('[Admin /me] Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('[Admin /me] Token verified, userId:', payload.userId);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!user) {
      console.log('[Admin /me] User not found, userId:', payload.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'ACTIVE') {
      console.log('[Admin /me] User not active, userId:', payload.userId);
      return res.status(403).json({ error: 'Account is not active' });
    }

    console.log('[Admin /me] User found:', user.email);
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error: any) {
    console.error('[Admin /me] Error:', error);
    console.error('[Admin /me] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get user',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

