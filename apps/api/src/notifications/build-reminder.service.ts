import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

@Injectable()
export class BuildReminderService {
  private readonly logger = new Logger(BuildReminderService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  // Run every day at 8:00 AM Vietnam time (UTC+7 = 1:00 UTC)
  @Cron('0 1 * * *')
  async checkBuildReminders() {
    this.logger.log('Checking build reminders...');

    if (!this.telegram.isConfigured) {
      this.logger.warn('Telegram not configured, skipping reminders');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find builds with startDate = today
    const builds = await this.prisma.build.findMany({
      where: {
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        assignees: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (builds.length === 0) {
      this.logger.log('No builds due today');
      return;
    }

    for (const build of builds) {
      const memberNames = build.assignees.map((a) => a.user.name).join(', ');
      const message = memberNames
        ? `Hôm nay là ngày gửi build "<b>${build.name}</b>" nhé anh <b>${memberNames}</b> ơi.`
        : `Hôm nay là ngày gửi build "<b>${build.name}</b>" nhé.`;

      await this.telegram.sendMessage(message);
      this.logger.log(`Sent reminder for build: ${build.name}`);
    }
  }

  // Manual trigger for testing
  async sendTestReminder() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const builds = await this.prisma.build.findMany({
      where: {
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        assignees: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (builds.length === 0) {
      return { sent: 0, message: 'No builds due today' };
    }

    let sent = 0;
    for (const build of builds) {
      const memberNames = build.assignees.map((a) => a.user.name).join(', ');
      const message = memberNames
        ? `Hôm nay là ngày gửi build "<b>${build.name}</b>" nhé anh <b>${memberNames}</b> ơi.`
        : `Hôm nay là ngày gửi build "<b>${build.name}</b>" nhé.`;

      const ok = await this.telegram.sendMessage(message);
      if (ok) sent++;
    }

    return { sent, total: builds.length };
  }
}
