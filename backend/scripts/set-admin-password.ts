import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function setAdminPassword() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Использование: npm run set-admin-password <email> <password>');
    console.error('Пример: npm run set-admin-password admin@example.com mypassword123');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Пароль должен быть не менее 6 символов');
    process.exit(1);
  }

  try {
    // Ищем пользователя по email
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        role: {
          in: ['ADMIN', 'MANAGER'],
        },
      },
    });

    if (!user) {
      console.error(`Пользователь с email ${email} и ролью ADMIN/MANAGER не найден`);
      console.error('Создайте пользователя в БД или обновите email существующего пользователя');
      process.exit(1);
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    console.log(`✅ Пароль успешно установлен для пользователя ${email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Роль: ${user.role}`);
    console.log(`   Статус: ${user.status}`);
  } catch (error) {
    console.error('Ошибка при установке пароля:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();

