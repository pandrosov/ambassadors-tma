// Типы пользователей
export enum UserRole {
  AMBASSADOR = 'AMBASSADOR',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export interface User {
  id: string;
  telegramId: bigint;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  // Данные амбассадора
  cdekPvz?: string; // Ближайший ПВЗ СДЭК
  address?: string; // Адрес проживания
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    vk?: string;
  };
  // Баланс флариков
  flarikiBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

// Типы заданий
export enum TaskType {
  GENERAL = 'GENERAL', // Общее задание для всех
  PERSONAL = 'PERSONAL' // Персональное задание
}

export enum TaskStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  // Для персональных заданий
  assignedUserIds?: string[];
  // Метаданные
  requirements?: string; // Требования к выполнению
  deadline?: Date;
  rewardFlariki?: number; // Награда в флариках
  createdBy: string; // ID менеджера/админа
  createdAt: Date;
  updatedAt: Date;
}

// Типы отчетов
export enum ReportType {
  VIDEO_LINK = 'VIDEO_LINK', // Ссылка на ролик
  STORY_SCREENSHOT = 'STORY_SCREENSHOT' // Скриншот охвата сторис
}

export enum ReportStatus {
  PENDING = 'PENDING', // Ожидает проверки
  APPROVED = 'APPROVED', // Одобрен
  REJECTED = 'REJECTED' // Отклонен
}

export interface Report {
  id: string;
  userId: string;
  taskId: string;
  type: ReportType;
  status: ReportStatus;
  // Данные отчета
  videoLink?: string; // Ссылка на ролик (YouTube, TikTok и т.д.)
  screenshotUrl?: string; // URL скриншота охвата
  // Статистика (заполняется парсером)
  views?: number;
  likes?: number;
  comments?: number;
  reach?: number; // Охват для сторис
  // Метаданные
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string; // Комментарии менеджера
}

// Транзакции флариков
export enum FlarikiTransactionType {
  EARNED = 'EARNED', // Заработано
  SPENT = 'SPENT', // Потрачено
  BONUS = 'BONUS', // Бонус
  PENALTY = 'PENALTY' // Штраф
}

export interface FlarikiTransaction {
  id: string;
  userId: string;
  type: FlarikiTransactionType;
  amount: number;
  reason: string; // Причина начисления/списания
  taskId?: string; // Связанное задание
  reportId?: string; // Связанный отчет
  createdAt: Date;
}

// Google Sheets синхронизация
export interface SheetsSync {
  id: string;
  reportId: string;
  sheetId: string; // ID Google Sheet
  rowNumber: number;
  syncedAt: Date;
}

