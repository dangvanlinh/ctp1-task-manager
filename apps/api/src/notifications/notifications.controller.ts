import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { BuildReminderService } from './build-reminder.service';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private buildReminder: BuildReminderService,
    private telegram: TelegramService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      telegramConfigured: this.telegram.isConfigured,
    };
  }

  @Post('test-reminder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PM')
  async testReminder() {
    return this.buildReminder.sendTestReminder();
  }

  @Post('test-message')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PM')
  async testMessage() {
    const ok = await this.telegram.sendMessage('Test message from CTP1 Task Manager');
    return { success: ok };
  }
}
