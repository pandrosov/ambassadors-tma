import cron from 'node-cron';
import { sendReportReminder } from '../services/telegram.js';
import { weeklyStatsParse } from '../services/statsParser.js';

/**
 * Настройка еженедельных задач
 */
export function setupWeeklyJobs() {
  // Каждую пятницу в 10:00 отправляем напоминания об отчетах
  cron.schedule('0 10 * * 5', async () => {
    console.log('Running weekly report reminder job...');
    try {
      await sendReportReminder();
      console.log('Weekly report reminder job completed');
    } catch (error) {
      console.error('Weekly report reminder job failed:', error);
    }
  });

  // Каждое воскресенье в 02:00 парсим статистику
  cron.schedule('0 2 * * 0', async () => {
    console.log('Running weekly stats parse job...');
    try {
      await weeklyStatsParse();
      console.log('Weekly stats parse job completed');
    } catch (error) {
      console.error('Weekly stats parse job failed:', error);
    }
  });

  console.log('Weekly cron jobs scheduled');
}

