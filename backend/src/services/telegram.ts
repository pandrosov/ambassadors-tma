import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';

let bot: TelegramBot | null = null;

/**
 * Инициализация Telegram Bot
 */
export function initTelegramBot(): TelegramBot {
  if (bot) return bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  bot = new TelegramBot(token, { polling: false });
  return bot;
}

/**
 * Получить экземпляр бота
 */
export function getTelegramBot(): TelegramBot {
  if (!bot) {
    return initTelegramBot();
  }
  return bot;
}

/**
 * Отправка уведомления о новом задании
 */
export async function notifyNewTask(taskId: string, userIds: string[]) {
  try {
    console.log(`notifyNewTask: Starting notification for task ${taskId} to users:`, userIds);
    const bot = getTelegramBot();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        deadline: true,
        status: true,
      },
    });

    if (!task) {
      console.error(`notifyNewTask: Task ${taskId} not found`);
      return;
    }

    console.log(`notifyNewTask: Task found: ${task.title}, status: ${task.status}`);

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
      },
    });

    console.log(`notifyNewTask: Found ${users.length} active users`);

    if (users.length === 0) {
      console.warn(`notifyNewTask: No active users found for IDs:`, userIds);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://identification-oem-bite-waves.trycloudflare.com';
    const message = `🎯 Новое задание: ${task.title}\n\n${task.description}\n\n${task.deadline ? `⏰ Дедлайн: ${new Date(task.deadline).toLocaleDateString('ru-RU')}` : ''}`;

    for (const user of users) {
      try {
        console.log(`notifyNewTask: Sending to user ${user.id} (telegramId: ${user.telegramId})`);
        await bot.sendMessage(user.telegramId, message, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Открыть задание',
                  web_app: { url: `${frontendUrl}/tasks/${task.id}` },
                },
              ],
            ],
          },
        });
        console.log(`notifyNewTask: Successfully sent to user ${user.id}`);
      } catch (error: any) {
        console.error(`notifyNewTask: Failed to send message to user ${user.id} (telegramId: ${user.telegramId}):`, error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          response: error.response,
        });
      }
    }
  } catch (error: any) {
    console.error('notifyNewTask: Failed to notify about new task:', error);
    console.error('Error stack:', error.stack);
  }
}

/**
 * Отправка напоминания о необходимости предоставить отчет (каждую пятницу)
 */
export async function sendReportReminder() {
  try {
    const bot = getTelegramBot();

    // Находим активные задания с незавершенными отчетами
    const activeTasks = await prisma.task.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                firstName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    for (const task of activeTasks) {
      const userIds = task.type === 'GENERAL'
        ? (await prisma.user.findMany({
            where: { status: 'ACTIVE', role: 'AMBASSADOR' },
            select: { id: true },
          })).map(u => u.id)
        : task.assignments.filter(a => a.user && a.user.status === 'ACTIVE').map(a => a.user.id).filter(Boolean);

      for (const userId of userIds) {
        // Проверяем, есть ли уже отчет за эту неделю
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Понедельник текущей недели
        weekStart.setHours(0, 0, 0, 0);

        const existingReport = await prisma.report.findFirst({
          where: {
            userId,
            taskId: task.id,
            submittedAt: {
              gte: weekStart,
            },
          },
        });

        if (!existingReport) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { telegramId: true, firstName: true },
          });

          if (user) {
            try {
              await bot.sendMessage(
                user.telegramId,
                `📋 Напоминание: необходимо предоставить отчет по заданию "${task.title}"\n\nПожалуйста, отправьте ссылку на ролик или скриншот охвата сторис.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: 'Отправить отчет',
                          web_app: { url: `${process.env.FRONTEND_URL}/tasks/${task.id}/report` },
                        },
                      ],
                    ],
                  },
                }
              );
            } catch (error) {
              console.error(`Failed to send reminder to user ${user.telegramId}:`, error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to send report reminders:', error);
  }
}

/**
 * Отправка сообщения пользователю через Telegram Bot
 */
export async function sendTelegramMessage(telegramId: number, message: string): Promise<void> {
  try {
    const bot = getTelegramBot();
    await bot.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to send message to ${telegramId}:`, error);
    throw error;
  }
}

/**
 * Создание или получение чата для отчета (для менеджеров)
 */
export async function createReportChat(reportId: string) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            telegramId: true,
            firstName: true,
            lastName: true,
          },
        },
        task: {
          select: {
            title: true,
          },
        },
        videoLinks: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // TODO: Реализовать создание группового чата с менеджером
    // Это может быть сделано через Telegram Bot API или через ManyChat интеграцию
    // Пока возвращаем информацию для ручного создания чата

    return {
      reportId: report.id,
      userId: report.user.telegramId,
      userName: `${report.user.firstName || ''} ${report.user.lastName || ''}`.trim(),
      taskTitle: report.task.title,
      videoLink: report.videoLinks && report.videoLinks.length > 0 ? report.videoLinks[0].url : null,
      screenshotUrl: report.screenshotUrl,
    };
  } catch (error) {
    console.error('Failed to create report chat:', error);
    throw error;
  }
}

