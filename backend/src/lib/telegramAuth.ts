import crypto from 'crypto';
import { getTelegramBot } from '../services/telegram.js';

/**
 * Проверка подписи initData от Telegram
 */
export function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('Failed to validate initData:', error);
    return false;
  }
}

/**
 * Парсинг initData и извлечение данных пользователя
 */
export function parseTelegramInitData(initData: string): {
  user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date?: number;
  hash?: string;
} {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    const result: any = {
      auth_date: params.get('auth_date') ? parseInt(params.get('auth_date')!) : undefined,
      hash: params.get('hash') || undefined,
    };

    if (userParam) {
      result.user = JSON.parse(decodeURIComponent(userParam));
    }

    return result;
  } catch (error) {
    console.error('Failed to parse initData:', error);
    return {};
  }
}

/**
 * Получение данных пользователя через Telegram Bot API
 */
export async function getTelegramUserData(telegramId: number): Promise<{
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
} | null> {
  try {
    const bot = getTelegramBot();
    
    // Пробуем получить данные через getChat
    try {
      const user = await bot.getChat(telegramId);
      
      return {
        id: user.id as number,
        first_name: (user as any).first_name,
        last_name: (user as any).last_name,
        username: (user as any).username,
        language_code: (user as any).language_code,
        is_premium: (user as any).is_premium,
      };
    } catch (chatError: any) {
      // Если getChat не работает, пробуем через getChatMember (для групп/каналов)
      // или просто возвращаем данные из initData если они есть
      console.warn(`getChat failed for ${telegramId}, trying alternative method:`, chatError.message);
      
      // В случае ошибки возвращаем null, но логируем для отладки
      return null;
    }
  } catch (error: any) {
    console.error(`Failed to get Telegram user data for ${telegramId}:`, error.message);
    console.error('Error details:', error);
    // Если пользователь не найден или бот не может получить данные, возвращаем null
    return null;
  }
}

