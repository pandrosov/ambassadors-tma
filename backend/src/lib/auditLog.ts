import { prisma } from './prisma';

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
  | 'TAGS_ASSIGNED';

export type EntityType = 'Task' | 'Report' | 'User' | 'Broadcast' | 'Tag';

interface AuditLogDetails {
  [key: string]: any;
}

/**
 * Создание записи в журнале аудита
 */
export async function createAuditLog(
  action: AuditAction,
  entityType: EntityType,
  userId: string,
  entityId?: string,
  details?: AuditLogDetails
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId: entityId || null,
        userId,
        details: details || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Не прерываем выполнение, если логирование не удалось
  }
}

