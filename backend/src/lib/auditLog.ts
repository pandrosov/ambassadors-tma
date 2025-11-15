import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

export type AuditAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_PUBLISHED'
  | 'TASK_DELETED'
  | 'REPORT_MODERATED'
  | 'REPORT_APPROVED'
  | 'REPORT_REJECTED'
  | 'USER_MODERATED'
  | 'USER_STATUS_CHANGED'
  | 'BROADCAST_CREATED'
  | 'BROADCAST_SENT'
  | 'TAG_CREATED'
  | 'TAG_DELETED'
  | 'TAGS_ASSIGNED'
  | 'SHOP_ITEM_CREATED'
  | 'SHOP_ITEM_UPDATED'
  | 'SHOP_ITEM_DELETED'
  | 'SHOP_PURCHASE'
  | 'PURCHASE_STATUS_UPDATED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED';

export type EntityType = 'Task' | 'Report' | 'User' | 'Broadcast' | 'Tag' | 'ShopItem' | 'Purchase' | 'Product';

interface AuditLogDetails {
  [key: string]: any;
}

interface CreateAuditLogOptions {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  userId: string;
  details?: AuditLogDetails | null;
}

/**
 * Создание записи в журнале аудита
 * Поддерживает два формата вызова для обратной совместимости
 */
export async function createAuditLog(
  actionOrOptions: AuditAction | CreateAuditLogOptions,
  entityType?: EntityType,
  userId?: string,
  entityId?: string,
  details?: AuditLogDetails | null
) {
  try {
    let action: AuditAction;
    let type: EntityType;
    let id: string | undefined;
    let user: string;
    let det: AuditLogDetails | null | undefined;

    // Проверяем формат вызова
    if (typeof actionOrOptions === 'object') {
      // Новый формат: объект
      action = actionOrOptions.action;
      type = actionOrOptions.entityType;
      id = actionOrOptions.entityId;
      user = actionOrOptions.userId;
      det = actionOrOptions.details;
    } else {
      // Старый формат: отдельные параметры
      action = actionOrOptions;
      type = entityType!;
      user = userId!;
      id = entityId;
      det = details;
    }

    await prisma.auditLog.create({
      data: {
        action,
        entityType: type,
        entityId: id || null,
        userId: user,
        details: det === null || det === undefined ? Prisma.JsonNull : det,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Не прерываем выполнение, если логирование не удалось
  }
}

