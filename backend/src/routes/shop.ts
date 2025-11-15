import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateTelegram, requireRole } from '../middleware/auth.js';
import { requireActiveStatus, requireProfileFilled } from '../middleware/profileCheck.js';
import { z } from 'zod';
import { createAuditLog } from '../lib/auditLog.js';

const router = Router();

// Схемы валидации
const purchaseSchema = z.object({
  shopItemId: z.string(),
  quantity: z.number().int().positive().min(1).max(10),
});

const updatePurchaseStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional(),
});

/**
 * Получить все товары магазина
 * GET /api/shop/items
 */
router.get('/items', authenticateTelegram, requireActiveStatus, async (req, res) => {
  try {
    const items = await prisma.shopItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { category: 'asc' },
        { price: 'asc' },
      ],
    });

    res.json(items);
  } catch (error) {
    console.error('Get shop items error:', error);
    res.status(500).json({ error: 'Failed to get shop items' });
  }
});

/**
 * Получить мои покупки
 * GET /api/shop/purchases
 */
router.get('/purchases', authenticateTelegram, requireActiveStatus, requireProfileFilled, async (req, res) => {
  try {
    const userId = req.user!.id;

    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
      },
      include: {
        shopItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(purchases);
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

/**
 * Купить товар
 * POST /api/shop/purchase
 */
router.post('/purchase', authenticateTelegram, requireActiveStatus, requireProfileFilled, async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = purchaseSchema.parse(req.body);

    // Получаем товар
    const shopItem = await prisma.shopItem.findUnique({
      where: { id: data.shopItemId },
    });

    if (!shopItem) {
      return res.status(404).json({ error: 'Shop item not found' });
    }

    if (!shopItem.isActive) {
      return res.status(400).json({ error: 'Shop item is not available' });
    }

    // Проверяем наличие товара
    if (shopItem.stock !== null && shopItem.stock < data.quantity) {
      return res.status(400).json({ error: 'Not enough items in stock' });
    }

    // Вычисляем общую стоимость
    const totalPrice = shopItem.price * data.quantity;

    // Получаем пользователя для проверки баланса
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { flarikiBalance: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.flarikiBalance < totalPrice) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        message: `Недостаточно флариков. Требуется: ${totalPrice}, доступно: ${user.flarikiBalance}`,
      });
    }

    // Создаем покупку и списываем фларики в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем покупку
      const purchase = await tx.purchase.create({
        data: {
          userId,
          shopItemId: data.shopItemId,
          quantity: data.quantity,
          totalPrice,
          status: 'PENDING',
        },
        include: {
          shopItem: true,
        },
      });

      // Списываем фларики
      await tx.user.update({
        where: { id: userId },
        data: {
          flarikiBalance: {
            decrement: totalPrice,
          },
        },
      });

      // Создаем транзакцию флариков
      await tx.flarikiTransaction.create({
        data: {
          userId,
          type: 'SPENT',
          amount: -totalPrice,
          reason: `Покупка: ${shopItem.name} x${data.quantity}`,
        },
      });

      // Уменьшаем количество товара на складе
      if (shopItem.stock !== null) {
        await tx.shopItem.update({
          where: { id: data.shopItemId },
          data: {
            stock: {
              decrement: data.quantity,
            },
          },
        });
      }

      return purchase;
    });

    // Логируем действие
    await createAuditLog({
      action: 'SHOP_PURCHASE',
      entityType: 'Purchase',
      entityId: result.id,
      userId,
      details: {
        shopItemId: data.shopItemId,
        shopItemName: shopItem.name,
        quantity: data.quantity,
        totalPrice,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Failed to purchase item' });
  }
});

/**
 * Обновить статус покупки (только для админов)
 * PATCH /api/shop/purchases/:id/status
 */
router.patch('/purchases/:id/status', authenticateTelegram, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = updatePurchaseStatusSchema.parse(req.body);
    const userId = req.user!.id;

    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        shopItem: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    // Логируем действие
    await createAuditLog({
      action: 'PURCHASE_STATUS_UPDATED',
      entityType: 'Purchase',
      entityId: id,
      userId,
      details: {
        oldStatus: purchase.status,
        newStatus: data.status,
        notes: data.notes,
      },
    });

    res.json(purchase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update purchase status error:', error);
    res.status(500).json({ error: 'Failed to update purchase status' });
  }
});

export default router;

