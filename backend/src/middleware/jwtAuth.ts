import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma.js';

export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
      return res.status(401).json({ error: 'Unauthorized', message: 'Пользователь не найден' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав доступа' });
    }

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

