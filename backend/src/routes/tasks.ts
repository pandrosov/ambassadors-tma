import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateTelegram, requireRole } from '../middleware/auth';
import { authenticateAdmin } from '../middleware/adminAuth';
import { requireActiveStatus, requireProfileFilled } from '../middleware/profileCheck';
import { createAuditLog } from '../lib/auditLog';
import { notifyNewTask, sendTelegramMessage } from '../services/telegram';
import { z } from 'zod';

const router = Router();

// Схемы валидации
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['GENERAL', 'PERSONAL']),
  requirements: z.string().optional(),
  deadline: z.string().datetime().optional(),
  rewardFlariki: z.number().int().positive().optional(),
  assignedUserIds: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  requirements: z.string().optional(),
  deadline: z.string().datetime().optional(),
  rewardFlariki: z.number().int().positive().optional(),
});

// Получить задания для текущего пользователя
router.get('/me', authenticateTelegram, requireActiveStatus, requireProfileFilled, async (req, res) => {
  try {
    const { status, type } = req.query;
    const userId = req.user!.id;

    console.log(`\n=== Get user tasks request ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Telegram ID: ${req.user!.telegramId}`);
    console.log(`Status filter: ${status || 'ACTIVE'}`);
    console.log(`Type filter: ${type || 'all'}`);
    console.log(`Request headers:`, {
      'x-telegram-init-data': req.headers['x-telegram-init-data'] ? 'present' : 'missing',
      'x-telegram-id': req.headers['x-telegram-id'],
    });

    const where: any = {
      OR: [
        { type: 'GENERAL' },
        {
          type: 'PERSONAL',
          assignments: {
            some: {
              userId,
            },
          },
        },
      ],
    };

    // По умолчанию показываем только активные задания, если статус не указан
    if (status) {
      where.status = status;
    } else {
      where.status = 'ACTIVE';
    }
    if (type) where.type = type;

    console.log('Get user tasks: Query where:', JSON.stringify(where, null, 2));

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignments: {
          where: { userId },
          select: {
            assignedAt: true,
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
            reports: {
              where: { userId },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Get user tasks: Found ${tasks.length} tasks for user ${userId}`);
    tasks.forEach((task, index) => {
      console.log(`  Task ${index + 1}: ${task.id} - ${task.title} (${task.type}, ${task.status})`);
    });

    res.json(tasks);
  } catch (error: any) {
    console.error('Get user tasks error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Получить конкретное задание
router.get('/:id', authenticateTelegram, requireActiveStatus, requireProfileFilled, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task.findFirst({
      where: {
        id,
        status: 'ACTIVE', // Показываем только активные задания
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
      include: {
        assignments: {
          where: { userId },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reports: {
          where: { userId },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Создать задание (только для менеджеров и админов)
// Поддерживает как Telegram аутентификацию, так и JWT для админ-панели
router.post('/', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    console.log('Create task: Request body:', {
      title: req.body.title,
      type: req.body.type,
      assignedUserIds: req.body.assignedUserIds,
      assignedUserIdsLength: req.body.assignedUserIds?.length,
    });
    
    const data = createTaskSchema.parse(req.body);
    
    console.log('Create task: Parsed data:', {
      title: data.title,
      type: data.type,
      assignedUserIds: data.assignedUserIds,
      assignedUserIdsLength: data.assignedUserIds?.length,
    });

    const taskData: any = {
      title: data.title,
      description: data.description,
      type: data.type,
      requirements: data.requirements,
      deadline: data.deadline ? new Date(data.deadline) : null,
      rewardFlariki: data.rewardFlariki,
      createdById: req.user!.id,
      status: 'DRAFT',
    };

    // Если персональное задание, создаем назначения
    if (data.type === 'PERSONAL') {
      if (!data.assignedUserIds || data.assignedUserIds.length === 0) {
        console.error('Create task: PERSONAL task without assigned users');
        return res.status(400).json({ 
          error: 'Validation error',
          message: 'Для персонального задания необходимо выбрать хотя бы одного пользователя',
          details: [{ path: ['assignedUserIds'], message: 'Необходимо выбрать хотя бы одного пользователя' }]
        });
      }
      
      console.log('Create task: Creating PERSONAL task with assignments:', data.assignedUserIds);
      taskData.assignments = {
        create: data.assignedUserIds.map((userId) => ({
          userId,
        })),
      };
    }

    const task = await prisma.task.create({
      data: taskData,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telegramId: true,
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
      },
    });

    // Логируем создание задания
    await createAuditLog(
      'TASK_CREATED',
      'Task',
      req.user!.id,
      task.id,
      { title: task.title, type: task.type }
    );

    console.log('Create task: Task created successfully:', {
      id: task.id,
      title: task.title,
      type: task.type,
      assignmentsCount: task.assignments.length,
    });

    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Create task: Validation error:', error.errors);
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create task error:', error);
    console.error('Create task error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create task',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Обновить задание (только для менеджеров и админов)
// Поддерживает как Telegram аутентификацию, так и JWT для админ-панели
router.patch('/:id', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateTaskSchema.parse(req.body);

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    if (data.rewardFlariki !== undefined) updateData.rewardFlariki = data.rewardFlariki;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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
      },
    });

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Опубликовать задание в бота (только для менеджеров и админов)
// Поддерживает как Telegram аутентификацию, так и JWT для админ-панели
router.post('/:id/publish', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Publish task: Publishing task ${id} by user ${req.user!.id}`);

    // Проверяем, что задание существует
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!task) {
      console.log(`Publish task: Task ${id} not found`);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Обновляем статус задания на ACTIVE и устанавливаем дату публикации
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
        publishedById: req.user!.id,
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telegramId: true,
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
      },
    });

    console.log(`Publish task: Task ${id} published successfully`);

    // Проверяем, что PERSONAL задание назначено пользователям
    if (task.type === 'PERSONAL' && updatedTask.assignments.length === 0) {
      console.warn(`Publish task: WARNING - PERSONAL задание не назначено никому!`);
      console.warn(`Publish task: Автоматически изменяем тип на GENERAL для доступности всем пользователям`);
      
      // Автоматически изменяем тип на GENERAL, если PERSONAL задание не назначено
      const fixedTask = await prisma.task.update({
        where: { id },
        data: {
          type: 'GENERAL',
        },
      });
      
      console.log(`Publish task: Тип задания изменен на GENERAL`);
      
      // Отправляем уведомления всем активным амбассадорам
      const ambassadors = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          role: 'AMBASSADOR',
        },
        select: {
          id: true,
          telegramId: true,
        },
      });
      console.log(`Publish task: Sending notifications to ${ambassadors.length} ambassadors`);
      await notifyNewTask(id, ambassadors.map(u => u.id));
    } else {
      // Отправляем уведомления пользователям
      try {
        if (task.type === 'GENERAL') {
          // Для общих заданий отправляем всем активным амбассадорам
          const ambassadors = await prisma.user.findMany({
            where: {
              status: 'ACTIVE',
              role: 'AMBASSADOR',
            },
            select: {
              id: true,
              telegramId: true,
            },
          });
          console.log(`Publish task: Sending notifications to ${ambassadors.length} ambassadors`);
          await notifyNewTask(id, ambassadors.map(u => u.id));
        } else if (task.type === 'PERSONAL') {
          // Для персональных заданий отправляем только назначенным пользователям
          const assignedUserIds = updatedTask.assignments.map(a => a.userId);
          console.log(`Publish task: Sending notifications to ${assignedUserIds.length} assigned users`);
          if (assignedUserIds.length > 0) {
            await notifyNewTask(id, assignedUserIds);
          } else {
            console.warn(`Publish task: PERSONAL задание не назначено никому, уведомления не отправлены`);
          }
        }
      } catch (notifyError: any) {
        console.error('Publish task: Failed to send notifications:', notifyError);
        // Не прерываем публикацию, если уведомления не отправились
      }
    }

    // Логируем публикацию
    await createAuditLog(
      'TASK_PUBLISHED',
      'Task',
      req.user!.id,
      updatedTask.id,
      { title: updatedTask.title, type: updatedTask.type }
    );

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Publish task error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to publish task',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получить все задания (для менеджеров и админов)
// Поддерживает как Telegram аутентификацию, так и JWT для админ-панели
router.get('/', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { status, type, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

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
              reports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

export default router;

