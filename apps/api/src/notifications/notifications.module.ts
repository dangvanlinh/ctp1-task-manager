import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramService } from './telegram.service';
import { BuildReminderService } from './build-reminder.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [TelegramService, BuildReminderService],
  exports: [TelegramService],
})
export class NotificationsModule {}
