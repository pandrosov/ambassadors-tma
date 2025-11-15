import { google } from 'googleapis';
import { prisma } from '../lib/prisma';

let sheetsClient: any = null;

/**
 * Инициализация клиента Google Sheets
 */
export async function initSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URI
  );

  if (process.env.GOOGLE_SHEETS_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_SHEETS_REFRESH_TOKEN,
    });
  }

  sheetsClient = google.sheets({ version: 'v4', auth: oauth2Client });
  return sheetsClient;
}

/**
 * Синхронизация отчета с Google Sheets
 */
export async function syncReportToSheets(reportId: string) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            telegramId: true,
            instagramLink: true,
            youtubeLink: true,
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

    if (!report) {
      throw new Error('Report not found');
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not set, skipping sync');
      return;
    }

    const client = await initSheetsClient();

    // Определяем диапазон для добавления данных
    const sheetName = 'Reports'; // Или можно сделать динамическим
    const range = `${sheetName}!A:Z`;

    // Получаем текущие данные, чтобы определить следующую строку
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const nextRow = rows.length + 1;

    // Подготавливаем данные для вставки
    const values = [
      [
        new Date().toISOString(), // Дата отправки
        report.user.firstName || '',
        report.user.lastName || '',
        report.user.telegramId.toString(),
        report.task.title,
        report.type,
        report.videoLink || report.screenshotUrl || '',
        report.status,
        report.views || '',
        report.likes || '',
        report.comments || '',
        report.reach || '',
        report.id,
      ],
    ];

    // Добавляем данные в таблицу
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    // Сохраняем информацию о синхронизации
    await prisma.sheetsSync.create({
      data: {
        reportId: report.id,
        sheetId: spreadsheetId,
        rowNumber: nextRow,
      },
    });

    console.log(`Report ${reportId} synced to Google Sheets at row ${nextRow}`);
  } catch (error) {
    console.error('Failed to sync report to sheets:', error);
    throw error;
  }
}

/**
 * Обновление статистики отчета в Google Sheets
 */
export async function updateReportStatsInSheets(reportId: string, stats: {
  views?: number;
  likes?: number;
  comments?: number;
  reach?: number;
}) {
  try {
    const sync = await prisma.sheetsSync.findFirst({
      where: { reportId },
      orderBy: { syncedAt: 'desc' },
    });

    if (!sync) {
      console.warn(`No sync found for report ${reportId}`);
      return;
    }

    const client = await initSheetsClient();
    const sheetName = 'Reports';

    // Обновляем статистику (предполагаем, что статистика в колонках I, J, K, L)
    const updates: any[] = [];
    if (stats.views !== undefined) {
      updates.push({
        range: `${sheetName}!I${sync.rowNumber}`,
        values: [[stats.views]],
      });
    }
    if (stats.likes !== undefined) {
      updates.push({
        range: `${sheetName}!J${sync.rowNumber}`,
        values: [[stats.likes]],
      });
    }
    if (stats.comments !== undefined) {
      updates.push({
        range: `${sheetName}!K${sync.rowNumber}`,
        values: [[stats.comments]],
      });
    }
    if (stats.reach !== undefined) {
      updates.push({
        range: `${sheetName}!L${sync.rowNumber}`,
        values: [[stats.reach]],
      });
    }

    if (updates.length > 0) {
      await client.spreadsheets.values.batchUpdate({
        spreadsheetId: sync.sheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updates,
        },
      });
    }
  } catch (error) {
    console.error('Failed to update report stats in sheets:', error);
    throw error;
  }
}

