import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Проверка, заполнен ли профиль пользователя
 */
export function requireProfileFilled(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  
  console.log('requireProfileFilled: Checking profile for user:', user?.id);
  
  if (!user) {
    console.warn('requireProfileFilled: Unauthorized - no user in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Проверяем, заполнены ли обязательные поля
  prisma.user.findUnique({
    where: { id: user.id },
    select: {
      phone: true,
      email: true,
      cdekPvz: true,
      address: true,
    },
  }).then((userData) => {
    if (!userData) {
      console.warn(`requireProfileFilled: User ${user.id} not found in DB`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем наличие хотя бы одного контактного поля
    const hasContactInfo = !!(userData.phone || userData.email);
    const hasAddressInfo = !!(userData.cdekPvz || userData.address);

    console.log(`requireProfileFilled: User ${user.id} profile check:`, {
      hasContactInfo,
      hasAddressInfo,
      phone: !!userData.phone,
      email: !!userData.email,
      cdekPvz: !!userData.cdekPvz,
      address: !!userData.address,
    });

    if (!hasContactInfo || !hasAddressInfo) {
      console.warn(`requireProfileFilled: Profile incomplete for user ${user.id}`, { hasContactInfo, hasAddressInfo });
      return res.status(403).json({ 
        error: 'Profile incomplete',
        message: 'Заполните профиль перед использованием функционала',
        required: {
          contact: !hasContactInfo,
          address: !hasAddressInfo,
        },
      });
    }

    console.log(`requireProfileFilled: Profile complete for user ${user.id}`);
    next();
  }).catch((error) => {
    console.error('Profile check error:', error);
    res.status(500).json({ error: 'Failed to check profile' });
  });
}

/**
 * Проверка статуса пользователя (должен быть ACTIVE)
 */
export function requireActiveStatus(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  
  console.log('requireActiveStatus: Checking status for user:', user?.id);
  
  if (!user) {
    console.warn('requireActiveStatus: Unauthorized - no user in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Нужно получить полные данные пользователя из БД, так как req.user может не содержать status
  prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      status: true,
    },
  }).then((userData) => {
    if (!userData) {
      console.warn(`requireActiveStatus: User ${user.id} not found in DB`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`requireActiveStatus: User ${user.id} status: ${userData.status}`);

    if (userData.status !== 'ACTIVE') {
      console.warn(`requireActiveStatus: User ${user.id} is not ACTIVE (status: ${userData.status})`);
      return res.status(403).json({ 
        error: 'Account not active',
        message: userData.status === 'PENDING' 
          ? 'Ваш аккаунт ожидает модерации. Обратитесь к администратору.'
          : 'Ваш аккаунт заблокирован или неактивен.',
        status: userData.status,
      });
    }

    console.log(`requireActiveStatus: User ${user.id} is ACTIVE, allowing access`);
    next();
  }).catch((error) => {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  });
}

