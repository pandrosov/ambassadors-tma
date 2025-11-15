import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { parseTelegramInitData, validateTelegramInitData, getTelegramUserData } from '../lib/telegramAuth';

// Расширяем тип Request для хранения пользователя
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        telegramId: number;
        role: string;
      };
    }
  }
}

/**
 * Middleware для проверки аутентификации через Telegram
 * Проверяет initData от Telegram Mini App
 */
export async function authenticateTelegram(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const initData = req.headers['x-telegram-init-data'] as string;
    const telegramIdHeader = req.headers['x-telegram-id'] as string;
    
    let telegramId: number | null = null;
    let telegramUserData: any = null;

    // Пробуем получить данные из initData
    if (initData && process.env.TELEGRAM_BOT_TOKEN) {
      // Проверяем подпись initData
      const isValid = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      if (isValid) {
        const parsed = parseTelegramInitData(initData);
        if (parsed.user?.id) {
          telegramId = parsed.user.id;
          telegramUserData = parsed.user;
          console.log('Got user data from initData:', {
            id: telegramUserData.id,
            username: telegramUserData.username,
            firstName: telegramUserData.first_name,
          });
        }
      } else {
        console.warn('Invalid initData signature');
      }
    }

    // Fallback на заголовок X-Telegram-Id
    if (!telegramId && telegramIdHeader) {
      telegramId = parseInt(telegramIdHeader);
    }
    
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        telegramId: true,
        role: true,
        status: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    // Если пользователя нет, создаем его
    if (!user) {
      // Пробуем получить данные через Bot API, если их нет в initData
      if (!telegramUserData && process.env.TELEGRAM_BOT_TOKEN) {
        try {
          telegramUserData = await getTelegramUserData(telegramId);
        } catch (error) {
          console.warn('Failed to get user data from Bot API:', error);
        }
      }

      console.log(`Creating user with telegramId: ${telegramId}`, telegramUserData);
      user = await prisma.user.create({
        data: {
          telegramId,
          username: telegramUserData?.username || null,
          firstName: telegramUserData?.first_name || null,
          lastName: telegramUserData?.last_name || null,
          role: 'AMBASSADOR',
          status: 'PENDING', // По умолчанию ожидает модерации
          flarikiBalance: 0,
        },
        select: {
          id: true,
          telegramId: true,
          role: true,
          status: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      });
    } else {
      // Обновляем данные пользователя из Telegram, если они изменились
      if (telegramUserData) {
        const updates: any = {};
        let needsUpdate = false;

        if (telegramUserData.username && telegramUserData.username !== user.username) {
          updates.username = telegramUserData.username;
          needsUpdate = true;
        }
        if (telegramUserData.first_name && telegramUserData.first_name !== user.firstName) {
          updates.firstName = telegramUserData.first_name;
          needsUpdate = true;
        }
        if (telegramUserData.last_name && telegramUserData.last_name !== user.lastName) {
          updates.lastName = telegramUserData.last_name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log('Updating user data from Telegram:', updates);
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
            select: {
              id: true,
              telegramId: true,
              role: true,
              status: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Разрешаем доступ для всех статусов, но проверяем в роутах
    // PENDING - может просматривать профиль, но не может использовать функционал
    // ACTIVE - полный доступ
    // INACTIVE/SUSPENDED - ограниченный доступ

    console.log('authenticateTelegram: User authenticated:', {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
      status: user.status,
    });

    req.user = {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware для проверки роли пользователя
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

