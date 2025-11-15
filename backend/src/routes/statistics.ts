import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';
import { z } from 'zod';

const router = Router();

// Схема валидации для фильтров статистики
const statisticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  taskId: z.string().optional(),
});

/**
 * Получить общую статистику за период
 * GET /api/statistics/overview
 */
router.get('/overview', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.submittedAt = {};
      if (query.startDate) where.submittedAt.gte = new Date(query.startDate);
      if (query.endDate) where.submittedAt.lte = new Date(query.endDate);
    }
    if (query.userId) where.userId = query.userId;
    if (query.taskId) where.taskId = query.taskId;

    // Получаем отчеты с включенными данными
    const reports = await prisma.report.findMany({
      where: {
        ...where,
        status: 'APPROVED', // Только одобренные отчеты
      },
      include: {
        videoLinks: true,
        stories: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Подсчитываем статистику
    let totalVideos = 0;
    let totalStories = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalStoryReach = 0;

    reports.forEach((report) => {
      // Видео
      totalVideos += report.videoLinks.length;
      report.videoLinks.forEach((link) => {
        totalViews += link.views || 0;
        totalLikes += link.likes || 0;
        totalComments += link.comments || 0;
      });

      // Сторис
      totalStories += report.stories.length;
      report.stories.forEach((story) => {
        totalStoryReach += story.reach || 0;
      });
    });

    res.json({
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      totals: {
        reports: reports.length,
        videos: totalVideos,
        stories: totalStories,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        storyReach: totalStoryReach,
      },
      reports: reports.map((report) => ({
        id: report.id,
        userId: report.userId,
        userName: `${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.username || 'Неизвестно',
        taskId: report.taskId,
        taskTitle: report.task.title,
        type: report.type,
        videos: report.videoLinks.length,
        stories: report.stories.length,
        views: report.videoLinks.reduce((sum, link) => sum + (link.views || 0), 0),
        likes: report.videoLinks.reduce((sum, link) => sum + (link.likes || 0), 0),
        comments: report.videoLinks.reduce((sum, link) => sum + (link.comments || 0), 0),
        storyReach: report.stories.reduce((sum, story) => sum + (story.reach || 0), 0),
        submittedAt: report.submittedAt,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get statistics overview error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * Получить рейтинг амбассадоров
 * GET /api/statistics/leaderboard
 */
router.get('/leaderboard', authenticateAdmin, requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.submittedAt = {};
      if (query.startDate) where.submittedAt.gte = new Date(query.startDate);
      if (query.endDate) where.submittedAt.lte = new Date(query.endDate);
    }
    if (query.taskId) where.taskId = query.taskId;

    // Получаем всех пользователей с их отчетами
    const users = await prisma.user.findMany({
      where: {
        role: 'AMBASSADOR',
        status: 'ACTIVE',
      },
      include: {
        reports: {
          where: {
            ...where,
            status: 'APPROVED',
          },
          include: {
            videoLinks: true,
            stories: true,
          },
        },
      },
    });

    // Подсчитываем статистику для каждого пользователя
    const leaderboard = users
      .map((user) => {
        let totalVideos = 0;
        let totalStories = 0;
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalStoryReach = 0;

        user.reports.forEach((report) => {
          totalVideos += report.videoLinks.length;
          report.videoLinks.forEach((link) => {
            totalViews += link.views || 0;
            totalLikes += link.likes || 0;
            totalComments += link.comments || 0;
          });

          totalStories += report.stories.length;
          report.stories.forEach((story) => {
            totalStoryReach += story.reach || 0;
          });
        });

        // Вычисляем рейтинг (можно настроить формулу)
        const rating = totalViews * 1 + totalLikes * 2 + totalComments * 3 + totalStoryReach * 0.5;

        return {
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Неизвестно',
          username: user.username,
          telegramId: user.telegramId,
          reportsCount: user.reports.length,
          videos: totalVideos,
          stories: totalStories,
          views: totalViews,
          likes: totalLikes,
          comments: totalComments,
          storyReach: totalStoryReach,
          rating: Math.round(rating * 100) / 100, // Округляем до 2 знаков
          flarikiBalance: user.flarikiBalance,
        };
      })
      .filter((user) => user.reportsCount > 0) // Только те, у кого есть отчеты
      .sort((a, b) => b.rating - a.rating); // Сортируем по рейтингу

    res.json({
      period: {
        startDate: query.startDate || null,
        endDate: query.endDate || null,
      },
      leaderboard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;

