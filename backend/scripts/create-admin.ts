import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const telegramId = process.argv[4] ? parseInt(process.argv[4]) : null;

  if (!email || !password) {
    console.error('Использование: npm run create-admin <email> <password> [telegramId]');
    console.error('Пример: npm run create-admin admin@example.com mypassword123 123456789');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Пароль должен быть не менее 6 символов');
    process.exit(1);
  }

  try {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      console.error(`Пользователь с email ${email} уже существует`);
      console.error('Используйте: npm run set-admin-password для установки пароля');
      process.exit(1);
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем админа
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        telegramId: telegramId ? BigInt(telegramId) : BigInt(0), // Если telegramId не указан, используем 0
        flarikiBalance: 0,
      },
    });

    console.log(`✅ Администратор успешно создан!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Роль: ${admin.role}`);
    console.log(`   Статус: ${admin.status}`);
    if (telegramId) {
      console.log(`   Telegram ID: ${telegramId}`);
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('Ошибка: Пользователь с таким email или telegramId уже существует');
    } else {
      console.error('Ошибка при создании администратора:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

