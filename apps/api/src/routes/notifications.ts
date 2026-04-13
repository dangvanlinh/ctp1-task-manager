import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard } from '../middleware/auth';
import { isTelegramConfigured, sendTelegramMessage } from '../lib/telegram';

const notifications = new Hono();

notifications.use('*', authMiddleware);

notifications.get('/status', async (c) => {
  return c.json({ telegramConfigured: isTelegramConfigured() });
});

notifications.post('/test-reminder', rolesGuard('ADMIN', 'PM'), async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const builds = await prisma.build.findMany({
    where: { startDate: { gte: today, lt: tomorrow } },
    include: {
      assignees: { include: { user: { select: { name: true } } } },
    },
  });

  let sent = 0;
  for (const build of builds) {
    const members = build.assignees.map((a) => a.user.name).join(', ');
    const text = `Hôm nay là ngày gửi build "<b>${build.name}</b>" nhé anh <b>${members}</b> ơi.`;
    if (await sendTelegramMessage(text)) sent++;
  }

  return c.json({ sent, total: builds.length, message: `Sent ${sent}/${builds.length} reminders` });
});

notifications.post('/test-message', rolesGuard('ADMIN', 'PM'), async (c) => {
  const success = await sendTelegramMessage('🔔 Test message from CTP1 Task Manager');
  return c.json({ success });
});

export { notifications };
