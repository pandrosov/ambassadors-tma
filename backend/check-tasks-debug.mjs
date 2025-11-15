import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTasksDebug() {
  try {
    // Получаем все задания
    const allTasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        publishedAt: true,
        createdAt: true,
        assignments: {
          select: {
            userId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                telegramId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n=== Все задания ===\n');
    allTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Статус: ${task.status}`);
      console.log(`   Тип: ${task.type}`);
      console.log(`   Опубликовано: ${task.publishedAt ? task.publishedAt.toISOString() : 'НЕТ'}`);
      console.log(`   Назначено пользователям: ${task.assignments.length}`);
      if (task.assignments.length > 0) {
        task.assignments.forEach((a, i) => {
          console.log(`     ${i + 1}. User ID: ${a.userId}, Telegram ID: ${a.user.telegramId}`);
        });
      }
      console.log('');
    });

    // Получаем пользователя
    const user = await prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        role: 'AMBASSADOR',
      },
    });

    if (!user) {
      console.log('Нет активных амбассадоров');
      return;
    }

    console.log(`\n=== Пользователь для проверки ===\n`);
    console.log(`ID: ${user.id}`);
    console.log(`Telegram ID: ${user.telegramId}`);
    console.log(`Статус: ${user.status}`);
    console.log(`Телефон: ${user.phone || 'НЕТ'}`);
    console.log(`Email: ${user.email || 'НЕТ'}`);
    console.log(`ПВЗ СДЭК: ${user.cdekPvz || 'НЕТ'}`);
    console.log(`Адрес: ${user.address || 'НЕТ'}`);

    // Проверяем, какие задания должны быть видны
    const where = {
      OR: [
        { type: 'GENERAL' },
        {
          type: 'PERSONAL',
          assignments: {
            some: {
              userId: user.id,
            },
          },
        },
      ],
      status: 'ACTIVE',
    };

    console.log('\n=== Условия запроса ===\n');
    console.log(JSON.stringify(where, null, 2));

    const visibleTasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        assignments: {
          select: {
            userId: true,
          },
        },
      },
    });

    console.log(`\n=== Найдено заданий для пользователя: ${visibleTasks.length} ===\n`);
    visibleTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (${task.type}, ${task.status})`);
      if (task.type === 'PERSONAL') {
        console.log(`   Назначено пользователю: ${task.assignments.some(a => a.userId === user.id) ? 'ДА' : 'НЕТ'}`);
      }
    });

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasksDebug();
