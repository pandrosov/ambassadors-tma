import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('🔐 Создание администратора для админ-панели\n');

    const email = await question('Введите email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Некорректный email');
      process.exit(1);
    }

    const password = await question('Введите пароль (минимум 6 символов): ');
    if (!password || password.length < 6) {
      console.error('❌ Пароль должен быть не менее 6 символов');
      process.exit(1);
    }

    const confirmPassword = await question('Подтвердите пароль: ');
    if (password !== confirmPassword) {
      console.error('❌ Пароли не совпадают');
      process.exit(1);
    }

    const firstName = await question('Введите имя (необязательно): ') || null;
    const lastName = await question('Введите фамилию (необязательно): ') || null;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      console.log(`\n⚠️  Пользователь с email ${email} уже существует`);
      const update = await question('Установить пароль для существующего пользователя? (y/n): ');
      if (update.toLowerCase() === 'y') {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            firstName: firstName || existingUser.firstName,
            lastName: lastName || existingUser.lastName,
          },
        });
        console.log(`\n✅ Пароль установлен для существующего пользователя!`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Email: ${email}`);
        console.log(`   Роль: ADMIN`);
        console.log(`   Статус: ACTIVE`);
        process.exit(0);
      } else {
        console.log('Отменено');
        process.exit(0);
      }
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
        telegramId: BigInt(0), // Временный ID, можно будет обновить позже
        flarikiBalance: 0,
      },
    });

    console.log(`\n✅ Администратор успешно создан!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Имя: ${admin.firstName || 'не указано'}`);
    console.log(`   Фамилия: ${admin.lastName || 'не указано'}`);
    console.log(`   Роль: ${admin.role}`);
    console.log(`   Статус: ${admin.status}`);
    console.log(`\n📝 Теперь вы можете войти в админ-панель используя этот email и пароль`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ Ошибка: Пользователь с таким email уже существует');
    } else {
      console.error('❌ Ошибка при создании администратора:', error);
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();

