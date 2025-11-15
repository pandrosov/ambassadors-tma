import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateTelegram, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Схема валидации для начисления флариков
const awardFlarikiSchema = z.object({
  userId: z.string(),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
  taskId: z.string().optional(),
  reportId: z.string().optional(),
});

// Получить баланс текущего пользователя
router.get('/balance', authenticateTelegram, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        flarikiBalance: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: user.flarikiBalance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Получить историю транзакций текущего пользователя
router.get('/transactions', authenticateTelegram, async (req, res) => {
  try {
    const { page = '1', limit = '50', type } = req.query;
    const userId = req.user!.id;

    const where: any = { userId };
    if (type) where.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.flarikiTransaction.findMany({
        where,
        skip,
        take,
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.flarikiTransaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Начислить фларики (только для менеджеров и админов)
router.post('/award', authenticateTelegram, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const data = awardFlarikiSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Создаем транзакцию
      const transaction = await tx.flarikiTransaction.create({
        data: {
          userId: data.userId,
          type: 'BONUS',
          amount: data.amount,
          reason: data.reason,
          taskId: data.taskId,
          reportId: data.reportId,
        },
      });

      // Обновляем баланс пользователя
      await tx.user.update({
        where: { id: data.userId },
        data: {
          flarikiBalance: {
            increment: data.amount,
          },
        },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Award flariki error:', error);
    res.status(500).json({ error: 'Failed to award flariki' });
  }
});

// Список флариков (для менеджеров и админов)
router.get('/stats', authenticateTelegram, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const stats = await prisma.flarikiTransaction.groupBy({
      by: ['type'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const totalBalance = await prisma.user.aggregate({
      _sum: {
        flarikiBalance: true,
      },
    });

    res.json({
      byType: stats,
      totalBalance: totalBalance._sum.flarikiBalance || 0,
    });
  } catch (error) {
    console.error('Get flariki stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

