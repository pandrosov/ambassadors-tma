import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Пропускаем OPTIONS запросы (CORS preflight) без проверки аутентификации
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Токен не предоставлен' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Недействительный токен' });
    }

    // Проверяем, что пользователь существует и имеет нужную роль
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      console.log('[JWT Auth] User not found, userId:', payload.userId);
      return res.status(401).json({ error: 'Unauthorized', message: 'Пользователь не найден' });
    }

    if (user.status !== 'ACTIVE') {
      console.log('[JWT Auth] User not active, userId:', payload.userId, 'status:', user.status);
      return res.status(403).json({ error: 'Forbidden', message: 'Аккаунт неактивен' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      console.log('[JWT Auth] Insufficient permissions, userId:', payload.userId, 'role:', user.role);
      return res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав доступа' });
    }

    console.log('[JWT Auth] User authenticated:', { id: user.id, role: user.role, status: user.status });

    req.user = {
      id: user.id,
      telegramId: 0, // Не используется для JWT аутентификации
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('JWT Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

