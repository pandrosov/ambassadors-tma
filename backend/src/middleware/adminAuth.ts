import { Request, Response, NextFunction } from 'express';
import { authenticateTelegram, requireRole as requireRoleAuth } from './auth';
import { authenticateJWT } from './jwtAuth';

/**
 * Универсальный middleware для админ-панели
 * Поддерживает как JWT (для веб-интерфейса), так и Telegram аутентификацию
 */
export function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Если есть Bearer токен, используем JWT
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return authenticateJWT(req, res, next);
  }
  // Иначе используем Telegram аутентификацию
  return authenticateTelegram(req, res, next);
}

/**
 * Экспорт requireRole для совместимости
 */
export const requireRole = requireRoleAuth;

