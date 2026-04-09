import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  private readonly chatId = process.env.TELEGRAM_CHAT_ID || '';

  get isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Telegram API error: ${err}`);
        return false;
      }

      this.logger.log(`Telegram message sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error}`);
      return false;
    }
  }
}
