import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateTelegram, requireRole } from '../middleware/auth';
import { getTelegramUserData } from '../lib/telegramAuth';
import { z } from 'zod';

const router = Router();

// Схемы валидации - более мягкая валидация
const updateUserSchema = z.object({
  phone: z.string().optional().nullable(),
  email: z.union([
    z.string().email(),
    z.literal(''),
    z.null(),
    z.undefined(),
  ]).optional(),
  cdekPvz: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  instagramLink: z.union([
    z.string().url(),
    z.literal(''),
    z.null(),
    z.undefined(),
  ]).optional(),
  youtubeLink: z.union([
    z.string().url(),
    z.literal(''),
    z.null(),
    z.undefined(),
  ]).optional(),
  tiktokLink: z.union([
    z.string().url(),
    z.literal(''),
    z.null(),
    z.undefined(),
  ]).optional(),
  vkLink: z.union([
    z.string().url(),
    z.literal(''),
    z.null(),
    z.undefined(),
  ]).optional(),
}).refine(
  (data) => {
    // Проверяем валидность URL если они заполнены (не пустые строки и не null)
    const urlFields = ['instagramLink', 'youtubeLink', 'tiktokLink', 'vkLink'];
    for (const field of urlFields) {
      const value = data[field as keyof typeof data];
      if (value && value !== '' && value !== null && typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return false; // Невалидный URL
        }
      }
    }
    return true;
  },
  { message: 'Одна из ссылок имеет неверный формат' }
);

// Получить текущего пользователя
router.get('/me', authenticateTelegram, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        cdekPvz: true,
        address: true,
        instagramLink: true,
        youtubeLink: true,
        tiktokLink: true,
        vkLink: true,
        flarikiBalance: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Синхронизировать данные из Telegram
router.post('/me/sync-telegram', authenticateTelegram, async (req, res) => {
  try {
    const telegramId = req.user!.telegramId;
    
    console.log(`Syncing Telegram data for user ${req.user!.id}, telegramId: ${telegramId}`);
    
    // Пробуем получить данные через Bot API
    let telegramData = await getTelegramUserData(telegramId);
    
    // Если Bot API не вернул данные, пробуем получить из initData (если есть)
    if (!telegramData) {
      console.log('Bot API failed, trying to get data from initData...');
      const initData = req.headers['x-telegram-init-data'] as string;
      if (initData && process.env.TELEGRAM_BOT_TOKEN) {
        try {
          const { parseTelegramInitData, validateTelegramInitData } = await import('../lib/telegramAuth');
          
          // Проверяем подпись initData
          const isValid = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
          if (isValid) {
            const parsed = parseTelegramInitData(initData);
            if (parsed.user) {
              telegramData = parsed.user;
              console.log('Got data from initData:', telegramData);
            } else {
              console.warn('initData parsed but no user data found');
            }
          } else {
            console.warn('initData signature validation failed');
          }
        } catch (parseError: any) {
          console.error('Failed to parse initData:', parseError.message);
        }
      } else {
        console.warn('No initData header or TELEGRAM_BOT_TOKEN not set');
      }
    }
    
    if (!telegramData) {
      console.warn('No Telegram data available from Bot API or initData');
      // Возвращаем текущего пользователя без изменений
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          cdekPvz: true,
          address: true,
          instagramLink: true,
          youtubeLink: true,
          tiktokLink: true,
          vkLink: true,
          flarikiBalance: true,
          createdAt: true,
        },
      });
      
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json(currentUser);
    }

    console.log('Updating user with Telegram data:', {
      username: telegramData.username,
      firstName: telegramData.first_name,
      lastName: telegramData.last_name,
    });

    // Обновляем данные пользователя
    const updateData: any = {};
    if (telegramData.username) updateData.username = telegramData.username;
    if (telegramData.first_name) updateData.firstName = telegramData.first_name;
    if (telegramData.last_name) updateData.lastName = telegramData.last_name;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        cdekPvz: true,
        address: true,
        instagramLink: true,
        youtubeLink: true,
        tiktokLink: true,
        vkLink: true,
        flarikiBalance: true,
        createdAt: true,
      },
    });

    console.log('User updated successfully:', user.id);
    res.json(user);
  } catch (error: any) {
    console.error('Sync Telegram data error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to sync Telegram data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Обновить профиль пользователя
router.patch('/me', authenticateTelegram, async (req, res) => {
  try {
    const rawData = req.body;
    console.log('Received update data:', JSON.stringify(rawData, null, 2));
    
    // Преобразуем пустые строки в null для опциональных полей
    const data: any = {};
    Object.keys(rawData).forEach(key => {
      const value = rawData[key];
      if (value === '' || value === null || value === undefined) {
        data[key] = null;
      } else {
        data[key] = value;
      }
    });

    console.log('Processed data before validation:', JSON.stringify(data, null, 2));

    // Валидация с более мягкими правилами
    let validatedData;
    try {
      validatedData = updateUserSchema.parse(data);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error details:', JSON.stringify(validationError.errors, null, 2));
        return res.status(400).json({ 
          error: 'Ошибка валидации', 
          message: validationError.errors[0]?.message || 'Проверьте правильность заполнения полей',
          details: validationError.errors 
        });
      }
      throw validationError;
    }

    console.log('Validated data:', JSON.stringify(validatedData, null, 2));

    // Подготовка данных для обновления
    const updateData: any = {};
    const fields = ['phone', 'email', 'cdekPvz', 'address', 'instagramLink', 'youtubeLink', 'tiktokLink', 'vkLink'];
    
    fields.forEach(field => {
      const value = validatedData[field as keyof typeof validatedData];
      updateData[field] = value === '' ? null : (value || null);
    });

    console.log('Update data for Prisma:', JSON.stringify(updateData, null, 2));

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        cdekPvz: true,
        address: true,
        instagramLink: true,
        youtubeLink: true,
        tiktokLink: true,
        vkLink: true,
        flarikiBalance: true,
        status: true,
      },
    });

    console.log('User updated successfully:', user.id);
    res.json(user);
  } catch (error: any) {
    console.error('Update user error:', error);
    console.error('Error stack:', error.stack);
    
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ 
        error: 'Ошибка валидации', 
        message: error.errors[0]?.message || 'Проверьте правильность заполнения полей',
        details: error.errors 
      });
    }
    
    // Проверка ошибок Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Нарушение уникальности данных' });
    }
    
    res.status(500).json({ 
      error: 'Не удалось обновить профиль',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получить историю транзакций флариков
router.get('/me/flariki', authenticateTelegram, async (req, res) => {
  try {
    const transactions = await prisma.flarikiTransaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        report: {
          select: {
            id: true,
            videoLinks: {
              select: {
                url: true,
              },
            },
          },
        },
      },
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get flariki transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Получить всех пользователей (только для менеджеров и админов)
router.get('/', authenticateTelegram, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { status, role, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          flarikiBalance: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

export default router;
