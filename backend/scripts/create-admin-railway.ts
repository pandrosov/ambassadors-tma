import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createAdmin() {
  // Параметры по умолчанию для Railway
  // В production можно изменить через переменные окружения
  const email = process.env.ADMIN_EMAIL || 'admin@ambassadors.tma';
  const password = process.env.ADMIN_PASSWORD || 'Admin123456!';
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME || 'User';

  try {
    console.log('🔐 Создание администратора...\n');

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  Пользователь с email ${email} уже существует`);
      
      // Обновляем существующего пользователя до админа
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: hashedPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
        },
      });

      console.log(`\n✅ Существующий пользователь обновлен до администратора!`);
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Роль: ${updatedUser.role}`);
      console.log(`   Статус: ${updatedUser.status}`);
      return;
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
        firstName,
        lastName,
        telegramId: BigInt(0), // Временный ID
        flarikiBalance: 0,
      },
    });

    console.log(`\n✅ Администратор успешно создан!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Имя: ${admin.firstName}`);
    console.log(`   Фамилия: ${admin.lastName}`);
    console.log(`   Роль: ${admin.role}`);
    console.log(`   Статус: ${admin.status}`);
    console.log(`\n📝 Теперь вы можете войти в админ-панель используя:`);
    console.log(`   Email: ${email}`);
    console.log(`   Пароль: ${password}`);
    console.log(`\n⚠️  ВАЖНО: Измените пароль после первого входа!`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ Ошибка: Пользователь с таким email уже существует');
    } else {
      console.error('❌ Ошибка при создании администратора:', error);
      console.error('Детали:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

