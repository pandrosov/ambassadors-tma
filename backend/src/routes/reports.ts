import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateTelegram, requireRole } from '../middleware/auth';
import { requireActiveStatus, requireProfileFilled } from '../middleware/profileCheck';
import { createAuditLog } from '../lib/auditLog';
import { sendTelegramMessage } from '../services/telegram';
import { uploadScreenshot, getFileUrl } from '../middleware/upload';
import { z } from 'zod';
import { syncReportToSheets } from '../services/sheets';

const router = Router();

// Схема для одного сторис
const storySchema = z.object({
  storyUrl: z.string().url(),
  screenshotFile: z.string().optional(), // Путь к загруженному файлу
  screenshotUrl: z.string().url().optional(), // URL скриншота
  reach: z.number().int().positive(), // Количество просмотров сторис
});

// Схемы валидации
const createReportSchema = z.object({
  taskId: z.string(),
  type: z.enum(['VIDEO_LINK', 'STORY_SCREENSHOT']),
  videoLinks: z.array(z.object({
    url: z.string().url(),
    platform: z.string().optional(),
    views: z.number().int().min(0).optional(), // Статистика видео
    likes: z.number().int().min(0).optional(),
    comments: z.number().int().min(0).optional(),
  })).optional(),
  // Поддержка нескольких сторис
  stories: z.array(storySchema).optional(),
  // Legacy поля для обратной совместимости
  screenshotUrl: z.string().url().optional(),
  screenshotFile: z.string().optional(),
  storyUrl: z.string().url().optional(),
  storyReach: z.number().int().positive().optional(),
  // Товары, связанные с отчетом
  productIds: z.array(z.string()).optional(), // Массив ID товаров
}).refine(
  (data) => {
    if (data.type === 'VIDEO_LINK') {
      // Для видео требуется хотя бы одна ссылка
      if (!data.videoLinks || data.videoLinks.length === 0) return false;
    }
    if (data.type === 'STORY_SCREENSHOT') {
      // Для Instagram сторис требуется хотя бы один сторис (новый формат) или legacy данные
      const hasStories = data.stories && data.stories.length > 0;
      const hasLegacyStory = !!(data.storyUrl && data.storyReach);
      const hasLegacyScreenshot = !!(data.screenshotUrl || data.screenshotFile) && data.storyReach;
      
      if (!hasStories && !hasLegacyStory && !hasLegacyScreenshot) {
        return false;
      }
    }
    return true;
  },
  { message: 'Для видео требуется хотя бы одна ссылка. Для Instagram сторис требуется хотя бы один сторис с данными.' }
);

const updateReportSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// Загрузка скриншота
router.post('/upload-screenshot', authenticateTelegram, requireActiveStatus, requireProfileFilled, uploadScreenshot.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const fileUrl = getFileUrl(req.file.filename);
    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      path: req.file.path,
    });
  } catch (error: any) {
    console.error('Upload screenshot error:', error);
    res.status(500).json({ error: 'Не удалось загрузить файл', message: error.message });
  }
});

// Создать отчет
router.post('/', authenticateTelegram, requireActiveStatus, requireProfileFilled, async (req, res) => {
  try {
    const data = createReportSchema.parse(req.body);
    const userId = req.user!.id;

    // Проверяем, что задание существует и доступно пользователю
    const task = await prisma.task.findFirst({
      where: {
        id: data.taskId,
        status: 'ACTIVE',
        OR: [
          { type: 'GENERAL' },
          {
            type: 'PERSONAL',
            assignments: {
              some: { userId },
            },
          },
        ],
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or not available' });
    }

    // Проверяем товары, если они указаны
    if (data.productIds && data.productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: data.productIds },
          isActive: true,
        },
      });
      
      if (products.length !== data.productIds.length) {
        return res.status(400).json({ 
          error: 'Invalid products',
          message: 'Некоторые товары не найдены или неактивны',
        });
      }
    }

    // Создаем отчет с множественными ссылками и сторис
    const report = await prisma.report.create({
      data: {
        userId,
        taskId: data.taskId,
        type: data.type,
        // Legacy поля для обратной совместимости
        screenshotUrl: data.screenshotUrl,
        screenshotFile: data.screenshotFile,
        storyUrl: data.storyUrl,
        storyReach: data.storyReach,
        reach: data.storyReach,
        status: 'PENDING',
        // Видео ссылки с статистикой
        videoLinks: data.videoLinks ? {
          create: data.videoLinks.map((link, index) => ({
            url: link.url,
            platform: link.platform || null,
            views: link.views || 0,
            likes: link.likes || 0,
            comments: link.comments || 0,
            order: index,
          })),
        } : undefined,
        // Несколько сторис
        stories: data.stories ? {
          create: data.stories.map((story, index) => ({
            storyUrl: story.storyUrl,
            screenshotFile: story.screenshotFile || null,
            screenshotUrl: story.screenshotUrl || null,
            reach: story.reach,
            order: index,
          })),
        } : data.storyUrl && data.storyReach ? {
          // Legacy: создаем один сторис из старых полей
          create: [{
            storyUrl: data.storyUrl,
            screenshotFile: data.screenshotFile || null,
            screenshotUrl: data.screenshotUrl || null,
            reach: data.storyReach,
            order: 0,
          }],
        } : undefined,
        // Связь с товарами
        products: data.productIds && data.productIds.length > 0 ? {
          create: data.productIds.map((productId) => ({
            productId,
            quantity: 1, // По умолчанию 1 единица товара
          })),
        } : undefined,
      },
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
          },
        },
        videoLinks: {
          orderBy: { order: 'asc' },
        },
        stories: {
          orderBy: { order: 'asc' },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    // Синхронизируем с Google Sheets
    try {
      await syncReportToSheets(report.id);
    } catch (error) {
      console.error('Failed to sync report to sheets:', error);
      // Не прерываем создание отчета, если синхронизация не удалась
    }

    res.status(201).json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Получить отчеты текущего пользователя
router.get('/me', authenticateTelegram, requireActiveStatus, requireProfileFilled, async (req, res) => {
  try {
    const { taskId, status, type } = req.query;
    const userId = req.user!.id;

    const where: any = { userId };
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;
    if (type) where.type = type;

    const reports = await prisma.report.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        videoLinks: {
          orderBy: { order: 'asc' },
        },
        stories: {
          orderBy: { order: 'asc' },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Получить конкретный отчет
router.get('/:id', authenticateTelegram, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const report = await prisma.report.findFirst({
      where: {
        id,
        userId, // Пользователь может видеть только свои отчеты
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
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
        stories: {
          orderBy: { order: 'asc' },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Обновить отчет (для менеджеров и админов - проверка/одобрение)
router.patch('/:id', authenticateTelegram, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateReportSchema.parse(req.body);

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      updateData.reviewedAt = new Date();
      updateData.reviewedById = req.user!.id;
      
      // Если отклоняем, требуем причину
      if (data.status === 'REJECTED' && !data.rejectionReason) {
        return res.status(400).json({ error: 'Причина отклонения обязательна' });
      }
      
      // Очищаем причину отклонения при одобрении
      if (data.status === 'APPROVED') {
        updateData.rejectionReason = null;
      }
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
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
      },
    });

    // Если отчет одобрен и есть награда за задание, начисляем фларики
    if (data.status === 'APPROVED') {
      const task = await prisma.task.findUnique({
        where: { id: report.taskId },
        select: { rewardFlariki: true, title: true },
      });

      if (task?.rewardFlariki && task.rewardFlariki > 0) {
        await prisma.$transaction([
          prisma.flarikiTransaction.create({
            data: {
              userId: report.userId,
              type: 'EARNED',
              amount: task.rewardFlariki,
              reason: `Награда за выполнение задания: ${task.title}`,
              taskId: report.taskId,
              reportId: report.id,
            },
          }),
          prisma.user.update({
            where: { id: report.userId },
            data: {
              flarikiBalance: {
                increment: task.rewardFlariki,
              },
            },
          }),
        ]);
      }
      
      // Отправляем уведомление пользователю
      try {
        await sendTelegramMessage(
          report.user.telegramId,
          `✅ Ваш отчет по заданию "${task?.title || report.task.title}" одобрен!${task?.rewardFlariki ? `\n💰 Начислено ${task.rewardFlariki} флариков` : ''}`
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
    } else {
      // Логируем модерацию
      await createAuditLog(
        'REPORT_MODERATED',
        'Report',
        req.user!.id,
        report.id,
        { status: data.status }
      );
    }

    res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Получить все отчеты (для менеджеров и админов)
router.get('/', authenticateTelegram, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { taskId, userId, status, type, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (type) where.type = type;

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

export default router;

