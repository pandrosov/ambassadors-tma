import { prisma } from '../lib/prisma';
import { updateReportStatsInSheets } from './sheets';

/**
 * Интерфейс для статистики из соцсетей
 */
interface SocialStats {
  views?: number;
  likes?: number;
  comments?: number;
  reach?: number;
}

/**
 * Парсинг статистики YouTube по ссылке
 * В реальной реализации здесь будет интеграция с YouTube Data API
 */
export async function parseYouTubeStats(videoUrl: string): Promise<SocialStats> {
  try {
    // TODO: Реализовать парсинг через YouTube Data API
    // Пример:
    // const videoId = extractVideoId(videoUrl);
    // const response = await youtube.videos.list({
    //   part: ['statistics'],
    //   id: [videoId],
    // });
    // const stats = response.data.items?.[0]?.statistics;
    
    // Заглушка для демонстрации
    console.log(`Parsing YouTube stats for: ${videoUrl}`);
    
    return {
      views: 0,
      likes: 0,
      comments: 0,
    };
  } catch (error) {
    console.error('Failed to parse YouTube stats:', error);
    throw error;
  }
}

/**
 * Парсинг статистики Instagram (для сторис и постов)
 * В реальной реализации здесь будет интеграция с Instagram Graph API или парсинг
 */
export async function parseInstagramStats(postUrl: string): Promise<SocialStats> {
  try {
    // TODO: Реализовать парсинг через Instagram Graph API или веб-скрапинг
    // Для сторис это может быть сложнее, так как Instagram API ограничен
    
    console.log(`Parsing Instagram stats for: ${postUrl}`);
    
    return {
      views: 0,
      likes: 0,
      comments: 0,
      reach: 0,
    };
  } catch (error) {
    console.error('Failed to parse Instagram stats:', error);
    throw error;
  }
}

/**
 * Парсинг статистики TikTok
 */
export async function parseTikTokStats(videoUrl: string): Promise<SocialStats> {
  try {
    // TODO: Реализовать парсинг через TikTok API или веб-скрапинг
    
    console.log(`Parsing TikTok stats for: ${videoUrl}`);
    
    return {
      views: 0,
      likes: 0,
      comments: 0,
    };
  } catch (error) {
    console.error('Failed to parse TikTok stats:', error);
    throw error;
  }
}

/**
 * Определение типа соцсети по URL
 */
function detectSocialPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | 'unknown' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  if (url.includes('tiktok.com')) {
    return 'tiktok';
  }
  return 'unknown';
}

/**
 * Парсинг статистики по типу отчета
 */
export async function parseReportStats(reportId: string): Promise<void> {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        type: true,
        videoLinks: {
          select: {
            url: true,
            platform: true,
          },
        },
        screenshotUrl: true,
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    let stats: SocialStats = {};

    if (report.type === 'VIDEO_LINK' && report.videoLinks && report.videoLinks.length > 0) {
      // Берем первую ссылку для парсинга
      const videoLink = report.videoLinks[0];
      const url = videoLink.url;
      const platform = videoLink.platform || detectSocialPlatform(url);
      
      switch (platform) {
        case 'youtube':
          stats = await parseYouTubeStats(url);
          break;
        case 'tiktok':
          stats = await parseTikTokStats(url);
          break;
        default:
          console.warn(`Unsupported platform for URL: ${url}`);
      }
    } else if (report.type === 'STORY_SCREENSHOT' && report.screenshotUrl) {
      // Для скриншотов сторис статистика может быть извлечена из изображения через OCR
      // или пользователь должен вручную указать охват
      // Пока оставляем пустым
      stats = {};
    }

    // Обновляем статистику в базе данных
    await prisma.report.update({
      where: { id: reportId },
      data: {
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        reach: stats.reach,
      },
    });

    // Обновляем статистику в Google Sheets
    try {
      await updateReportStatsInSheets(reportId, stats);
    } catch (error) {
      console.error('Failed to update stats in sheets:', error);
      // Не прерываем процесс, если обновление в Sheets не удалось
    }

    console.log(`Stats parsed for report ${reportId}:`, stats);
  } catch (error) {
    console.error(`Failed to parse stats for report ${reportId}:`, error);
    throw error;
  }
}

/**
 * Еженедельный парсинг статистики для всех отчетов
 */
export async function weeklyStatsParse() {
  try {
    // Находим все отчеты за последнюю неделю, у которых еще нет статистики
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const reports = await prisma.report.findMany({
      where: {
        submittedAt: {
          gte: weekAgo,
        },
        status: 'APPROVED',
        OR: [
          { views: null },
          { videoLinks: { some: {} } },
        ],
      },
      select: {
        id: true,
      },
    });

    console.log(`Found ${reports.length} reports to parse stats for`);

    for (const report of reports) {
      try {
        await parseReportStats(report.id);
        // Добавляем небольшую задержку, чтобы не перегружать API соцсетей
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to parse stats for report ${report.id}:`, error);
      }
    }

    console.log('Weekly stats parsing completed');
  } catch (error) {
    console.error('Failed to run weekly stats parse:', error);
    throw error;
  }
}

