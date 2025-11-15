import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function activateAdmin() {
  const email = process.argv[2] || 'admin@ambassadors.tma';

  try {
    console.log(`🔐 Активация администратора: ${email}\n`);

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Пользователь с email ${email} не найден`);
      process.exit(1);
    }

    if (user.status === 'ACTIVE' && user.role === 'ADMIN') {
      console.log(`✅ Администратор уже активен:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Роль: ${user.role}`);
      console.log(`   Статус: ${user.status}`);
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        role: 'ADMIN',
      },
    });

    console.log(`\n✅ Администратор успешно активирован!`);
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Роль: ${updatedUser.role}`);
    console.log(`   Статус: ${updatedUser.status}`);
  } catch (error: any) {
    console.error('❌ Ошибка при активации администратора:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

activateAdmin();

