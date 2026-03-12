// telegram/telegram.service.ts
import TelegramBot from 'node-telegram-bot-api';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private logger = new Logger(TelegramService.name);

  private limiter = new Bottleneck({
    minTime: 1100, // 1 сообщение в ~1 секунду
  });

  constructor(private db: PrismaService) {
    this.bot = new TelegramBot(process.env.TG_TOKEN!, {
      polling: true,
    });

    this.bot.on('polling_error', (err: any) => {
      this.logger.error(`Polling error: ${err.code} ${err.message}`);
    });

    this.bot.on('webhook_error', (err: any) => {
      this.logger.error(`Webhook error: ${err.code} ${err.message}`);
    });

    this.bot.on('message', async (msg) => {
      if (!msg.text?.startsWith('/start')) return;

      const parts = msg.text.split(' ');
      const token = parts[1];
      const chatId = msg.chat.id.toString();

      if (!token) {
        await this.bot.sendMessage(chatId, 'Используй кнопку из приложения 🙂');
        return;
      }

      const linkToken = await this.db.telegramLinkToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!linkToken || linkToken.usedAt || linkToken.expiresAt < new Date()) {
        await this.bot.sendMessage(chatId, 'Ссылка устарела ❌');
        return;
      }

      await this.db.user.update({
        where: { id: linkToken.userId },
        data: {
          telegramChatId: chatId,
          telegramEnabled: true,
        },
      });

      await this.db.telegramLinkToken.update({
        where: { id: linkToken.id },
        data: { usedAt: new Date() },
      });

      await this.bot.sendMessage(
        chatId,
        '✅ Telegram успешно подключён! Теперь я буду присылать уведомления.',
      );
    });
  }

  async sendMessage(chatId: string, text: string) {
    if (!chatId) {
      throw new BadRequestException('User has no telegram chat connected');
    }
    console.log(+chatId, text);
    //return null;
    const safeText = text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');

    try {
      // Отправка через лимитер
      const result = await this.limiter.schedule(() =>
        this.bot.sendMessage(+chatId, safeText, { parse_mode: 'MarkdownV2' }),
      );
      return result;
    } catch (err: any) {
      // Обрабатываем типичные ошибки Telegram
      if (err.response?.body) {
        const body = err.response.body;

        // чат не найден
        if (
          body.error_code === 400 &&
          /chat not found/i.test(body.description)
        ) {
          throw new BadRequestException(
            'Telegram chat not found for this user',
          );
        }

        // некорректный формат текста
        if (
          body.error_code === 400 &&
          /can't parse entities/i.test(body.description)
        ) {
          throw new BadRequestException(
            'Telegram message contains invalid characters',
          );
        }

        // лимит сообщений
        if (body.error_code === 429) {
          throw new BadRequestException(
            'Too many requests to Telegram API, try later',
          );
        }

        // любая другая ошибка
        throw new BadRequestException(
          `Telegram API error: ${body.description}`,
        );
      }

      throw new BadRequestException(
        `Telegram sendMessage error: ${err.message}`,
      );
    }
  }

  async createLink(userId: number, token: string) {
    await this.db.telegramLinkToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
      },
    });

    return {
      link: `https://t.me/${process.env.TG_BOT_NAME}?start=${token}`,
    };
  }

  async disconnect(userId: number) {
    await this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        telegramChatId: null,
        telegramEnabled: false,
      },
    });

    return {
      ok: true,
    };
  }
  async notifyTgChange(userId: number, isEnabled: boolean) {
    await this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        telegramEnabled: isEnabled,
      },
    });

    return {
      ok: true,
    };
  }
}
