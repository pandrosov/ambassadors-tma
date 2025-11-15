import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import { createAuditLog } from '../lib/auditLog';
import { htmlToTelegramSimple } from '../lib/htmlToTelegram';
import { sendTelegramMessage, notifyNewTask } from '../services/telegram';
import { z } from 'zod';

const router = Router();

// Схемы валидации
const moderateUserSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED']),
  notes: z.string().optional(),
});

const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

const assignTagsSchema = z.object({
  userId: z.string(),
  tagIds: z.array(z.string()),
});

const createBroadcastSchema = z.object({
  title: z.string().min(1, 'Заголовок обязателен'),
  message: z.string().min(1, 'Сообщение обязательно'),
  tagIds: z.array(z.string()).optional().default([]),
  taskIds: z.array(z.string()).optional().default([]), // Привязка заданий к рассылке
});

const moderateReportSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// Получить пользователей для модерации
router.get('/users', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { status, page = '1', limit = '20', search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          moderatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
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

// Модерировать пользователя
router.patch('/users/:id/moderate', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = moderateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: data.status,
        moderatedAt: new Date(),
        moderatedById: req.user!.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        moderatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Отправляем уведомление пользователю
    if (data.status === 'ACTIVE') {
      try {
        await sendTelegramMessage(
          user.telegramId,
          '✅ Ваш аккаунт одобрен! Теперь вы можете использовать все функции приложения.'
        );
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    // Логируем модерацию
    await createAuditLog(
      'USER_MODERATED',
      'User',
      req.user!.id,
      user.id,
      { status: data.status, notes: data.notes }
    );

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Moderate user error:', error);
    res.status(500).json({ error: 'Failed to moderate user' });
  }
});

// Получить все теги
router.get('/tags', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Создать тег
router.post('/tags', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const data = createTagSchema.parse(req.body);

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        description: data.description,
      },
    });

    // Логируем создание тега
    await createAuditLog(
      'TAG_CREATED',
      'Tag',
      req.user!.id,
      tag.id,
      { name: tag.name }
    );

    res.status(201).json(tag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Удалить тег
router.delete('/tags/:id', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { name: true },
    });

    await prisma.tag.delete({
      where: { id },
    });

    // Логируем удаление тега
    if (tag) {
      await createAuditLog(
        'TAG_DELETED',
        'Tag',
        req.user!.id,
        id,
        { name: tag.name }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Назначить теги пользователю
router.post('/users/:id/tags', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = assignTagsSchema.parse({ ...req.body, userId: id });

    // Удаляем все существующие теги пользователя
    await prisma.userTag.deleteMany({
      where: { userId: id },
    });

    // Добавляем новые теги
    if (data.tagIds.length > 0) {
      await prisma.userTag.createMany({
        data: data.tagIds.map((tagId) => ({
          userId: id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Логируем назначение тегов
    await createAuditLog(
      'TAGS_ASSIGNED',
      'User',
      req.user!.id,
      user!.id,
      { tagIds: data.tagIds }
    );

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Assign tags error:', error);
    res.status(500).json({ error: 'Failed to assign tags' });
  }
});

// Получить все задания для админ-панели
router.get('/tasks', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    console.log('Admin get tasks: Request from user', req.user!.id);
    const { status, type, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    console.log('Admin get tasks: Query params:', { status, type, page, limit, skip, take });
    console.log('Admin get tasks: Where clause:', JSON.stringify(where, null, 2));

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    console.log('Admin get tasks: Found', tasks.length, 'tasks, total:', total);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    console.error('Admin get tasks error:', error);
    console.error('Admin get tasks error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get tasks',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получить все отчеты для модерации
router.get('/reports', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          videoLinks: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Модерировать отчет
router.patch('/reports/:id/moderate', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = moderateReportSchema.parse(req.body);

    if (data.status === 'REJECTED' && !data.rejectionReason) {
      return res.status(400).json({ error: 'Причина отклонения обязательна' });
    }

    const updateData: any = {
      status: data.status,
      reviewedAt: new Date(),
      reviewedById: req.user!.id,
    };

    if (data.status === 'APPROVED') {
      updateData.rejectionReason = null;
    } else if (data.status === 'REJECTED' && data.rejectionReason) {
      updateData.rejectionReason = data.rejectionReason;
    }

    if (data.notes !== undefined) updateData.notes = data.notes;

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            rewardFlariki: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        videoLinks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Если отчет одобрен и есть награда за задание, начисляем фларики
    if (data.status === 'APPROVED') {
      if (report.task.rewardFlariki && report.task.rewardFlariki > 0) {
        await prisma.$transaction([
          prisma.flarikiTransaction.create({
            data: {
              userId: report.userId,
              type: 'EARNED',
              amount: report.task.rewardFlariki,
              reason: `Награда за выполнение задания: ${report.task.title}`,
              taskId: report.taskId,
              reportId: report.id,
            },
          }),
          prisma.user.update({
            where: { id: report.userId },
            data: {
              flarikiBalance: {
                increment: report.task.rewardFlariki,
              },
            },
          }),
        ]);
      }

      // Отправляем уведомление пользователю
      try {
        await sendTelegramMessage(
          report.user.telegramId,
          `✅ Ваш отчет по заданию "${report.task.title}" одобрен!${report.task.rewardFlariki ? `\n💰 Начислено ${report.task.rewardFlariki} флариков` : ''}`
        );
      } catch (error) {
        console.error('Failed to send approval notification:', error);
      }

      // Логируем действие
      await createAuditLog(
        'REPORT_APPROVED',
        'Report',
        req.user!.id,
        report.id,
        { taskId: report.taskId, userId: report.userId }
      );
    } else if (data.status === 'REJECTED') {
      // Отправляем уведомление пользователю об отклонении
      try {
        await sendTelegramMessage(
          report.user.telegramId,
          `❌ Ваш отчет по заданию "${report.task.title}" отклонен.\n\nПричина: ${updateData.rejectionReason || 'Не указана'}`
        );
      } catch (error) {
        console.error('Failed to send rejection notification:', error);
      }

      // Логируем действие
      await createAuditLog(
        'REPORT_REJECTED',
        'Report',
        req.user!.id,
        report.id,
        { taskId: report.taskId, userId: report.userId, rejectionReason: updateData.rejectionReason }
      );
    }

    res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Moderate report error:', error);
    res.status(500).json({ error: 'Failed to moderate report' });
  }
});

// Создать рассылку
router.post('/broadcasts', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    console.log('Broadcast: Creating broadcast with raw body:', {
      title: req.body.title,
      tagIds: req.body.tagIds,
      taskIds: req.body.taskIds,
      messageLength: req.body.message?.length,
      hasMessage: !!req.body.message,
    });
    
    const data = createBroadcastSchema.parse(req.body);
    
    console.log('Broadcast: Parsed data:', {
      title: data.title,
      tagIds: data.tagIds,
      taskIds: data.taskIds,
      messageLength: data.message?.length,
    });

    // Определяем список пользователей для рассылки
    let userIds: string[] = [];

    if (data.tagIds && data.tagIds.length > 0) {
      // Фильтруем по тегам
      const usersWithTags = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          tags: {
            some: {
              tagId: {
                in: data.tagIds,
              },
            },
          },
        },
        select: {
          id: true,
          telegramId: true,
        },
      });
      userIds = usersWithTags.map(u => u.id);
    } else {
      // Рассылка всем активным пользователям
      const allUsers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          telegramId: true,
        },
      });
      userIds = allUsers.map(u => u.id);
    }

    // Конвертируем HTML сообщение в Telegram форматирование
    const telegramMessage = htmlToTelegramSimple(data.message);
    const formattedMessage = `📢 ${data.title}\n\n${telegramMessage}`;

    // Создаем запись о рассылке
    const broadcast = await prisma.broadcast.create({
      data: {
        title: data.title,
        message: data.message,
        tagIds: data.tagIds || [],
        taskIds: data.taskIds || [],
        createdById: req.user!.id,
        sentCount: userIds.length,
        sentAt: new Date(),
        ...(data.taskIds && data.taskIds.length > 0 && {
          tasks: {
            create: data.taskIds.map((taskId: string) => ({
              taskId,
            })),
          },
        }),
      },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Отправляем сообщения (асинхронно, не блокируем ответ)
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        telegramId: true,
      },
    });

    // Отправляем сообщения в фоне
    console.log(`Broadcast: Sending to ${users.length} users`);
    console.log(`Broadcast: Task IDs: ${data.taskIds?.join(', ') || 'none'}`);
    
    Promise.all(
      users.map(async (user) => {
        try {
          // Отправляем основное сообщение рассылки
          console.log(`Broadcast: Sending message to user ${user.id} (telegramId: ${user.telegramId})`);
          await sendTelegramMessage(user.telegramId, formattedMessage);
          console.log(`Broadcast: Message sent to user ${user.id}`);
          
          // Если есть привязанные задания, отправляем их
          if (data.taskIds && data.taskIds.length > 0) {
            console.log(`Broadcast: Sending ${data.taskIds.length} tasks to user ${user.id}`);
            for (const taskId of data.taskIds) {
              try {
                console.log(`Broadcast: Notifying about task ${taskId} to user ${user.id}`);
                await notifyNewTask(taskId, [user.id]);
                console.log(`Broadcast: Task ${taskId} notification sent to user ${user.id}`);
              } catch (taskErr: any) {
                console.error(`Broadcast: Failed to send task ${taskId} to user ${user.id}:`, taskErr);
              }
            }
          }
        } catch (err: any) {
          console.error(`Broadcast: Failed to send to user ${user.id} (telegramId: ${user.telegramId}):`, err);
          console.error('Error details:', {
            message: err.message,
            code: err.code,
            response: err.response,
          });
        }
      })
    ).catch(err => {
      console.error('Broadcast: Promise.all error:', err);
    });

    // Логируем создание рассылки
    await createAuditLog(
      'BROADCAST_CREATED',
      'Broadcast',
      req.user!.id,
      broadcast.id,
      { 
        title: broadcast.title, 
        recipientsCount: userIds.length,
        taskIds: data.taskIds || []
      }
    );

    console.log(`Broadcast: Created successfully, ID: ${broadcast.id}, Recipients: ${userIds.length}`);

    res.status(201).json({
      ...broadcast,
      recipientsCount: userIds.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Broadcast: Validation error:', error.errors);
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Broadcast: Create error:', error);
    console.error('Broadcast: Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create broadcast',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получить историю рассылок
router.get('/broadcasts', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(broadcasts);
  } catch (error) {
    console.error('Get broadcasts error:', error);
    res.status(500).json({ error: 'Failed to get broadcasts' });
  }
});

// Получить историю логов
router.get('/audit-logs', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { action, entityType, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// ==================== Управление магазином (ShopItems) ====================

const createShopItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().int().positive(),
  stock: z.number().int().min(0).nullable().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateShopItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Получить все товары магазина
 * GET /api/admin/shop-items
 */
router.get('/shop-items', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const shopItems = await prisma.shopItem.findMany({
      orderBy: [
        { category: 'asc' },
        { price: 'asc' },
      ],
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    res.json(shopItems);
  } catch (error) {
    console.error('Get shop items error:', error);
    res.status(500).json({ error: 'Failed to get shop items' });
  }
});

/**
 * Создать товар магазина
 * POST /api/admin/shop-items
 */
router.post('/shop-items', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = createShopItemSchema.parse(req.body);

    const shopItem = await prisma.shopItem.create({
      data: {
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        price: data.price,
        stock: data.stock !== undefined ? data.stock : null,
        category: data.category || null,
        isActive: data.isActive ?? true,
      },
    });

    // Логируем действие
    await createAuditLog({
      action: 'SHOP_ITEM_CREATED',
      entityType: 'ShopItem',
      entityId: shopItem.id,
      userId,
      details: {
        name: shopItem.name,
        price: shopItem.price,
      },
    });

    res.status(201).json(shopItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create shop item error:', error);
    res.status(500).json({ error: 'Failed to create shop item' });
  }
});

/**
 * Обновить товар магазина
 * PATCH /api/admin/shop-items/:id
 */
router.patch('/shop-items/:id', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const data = updateShopItemSchema.parse(req.body);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const shopItem = await prisma.shopItem.update({
      where: { id },
      data: updateData,
    });

    // Логируем действие
    await createAuditLog({
      action: 'SHOP_ITEM_UPDATED',
      entityType: 'ShopItem',
      entityId: id,
      userId,
      details: updateData,
    });

    res.json(shopItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update shop item error:', error);
    res.status(500).json({ error: 'Failed to update shop item' });
  }
});

/**
 * Удалить товар магазина
 * DELETE /api/admin/shop-items/:id
 */
router.delete('/shop-items/:id', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Проверяем, есть ли покупки этого товара
    const purchaseCount = await prisma.purchase.count({
      where: { shopItemId: id },
    });

    if (purchaseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete shop item',
        message: `Товар был куплен ${purchaseCount} раз(а). Рекомендуется деактивировать товар вместо удаления.`,
      });
    }

    await prisma.shopItem.delete({
      where: { id },
    });

    // Логируем действие
    await createAuditLog({
      action: 'SHOP_ITEM_DELETED',
      entityType: 'ShopItem',
      entityId: id,
      userId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete shop item error:', error);
    res.status(500).json({ error: 'Failed to delete shop item' });
  }
});

/**
 * Получить все покупки
 * GET /api/admin/purchases
 */
router.get('/purchases', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { status, userId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId as string;

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            telegramId: true,
          },
        },
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

export default router;
