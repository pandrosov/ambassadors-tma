import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../lib/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
      console.log('Admin /me: No authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    console.log('Admin /me: Verifying token...');
    
    const { verifyToken } = await import('../lib/jwt');
    const payload = verifyToken(token);

    if (!payload) {
      console.log('Admin /me: Invalid token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Admin /me: Token verified, userId:', payload.userId);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      console.log('Admin /me: User not found, userId:', payload.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('Admin /me: User found:', user.email);
    res.json(user);
  } catch (error: any) {
    console.error('Get me error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get user',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

