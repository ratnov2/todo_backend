// notification/notification.service.ts
import { Injectable, BadRequestException, LoggerService, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TelegramService } from '../telegram/telegram.service'
import { NotificationType, TaskStatus } from '@prisma/client'
import { CreateNotificationDto } from './ts/create-notification.dto'
import * as cron from 'node-cron';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,

  ) {
    this.startCron()
  }

  async create(userId: number, data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: userId,
        taskId: data.taskId,
        type: data.type,
        offsetMinutes: data.offsetMinutes,
        noProgressDays: data.noProgressDays,
      },
    })
  }

  async sendTest(notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: true,
        task: true,
      },
    })

    if (!notification) {
      throw new BadRequestException('Notification not found')
    }
    console.log(notification.user);

    if (!notification.user.telegramChatId) {
      throw new BadRequestException('User has no telegram connected')
    }

    const text = this.formatMessage(notification)

    await this.telegram.sendMessage(
      notification.user.telegramChatId,
      text,
    )

    return { ok: true }
  }

  private formatMessage(n: any) {
    return `🔔 *Напоминание*

    *Задача:* ${n.task.title}
    Тип: ${n.type}
    `
  }
  private startCron() {
    // проверяем каждую минуту
    cron.schedule('* * * * *', async () => {
      await this.checkAndSendNotifications();
    });
  }

  private async checkAndSendNotifications() {
    const now = new Date();
    this.logger.log('checkAndSendNotifications', now)
    // берем все активные уведомления
    const notifications = await this.prisma.notification.findMany({
      where: { isEnabled: true },
      include: { user: true, task: true, schedule: true },
    });

    for (const n of notifications) {
      try {
        // пример проверки для BEFORE_RUN
        if (n.type === 'BEFORE_RUN' && n.schedule && n.offsetMinutes != null) {
          const scheduledTime = new Date(n.schedule.runAt!);
          scheduledTime.setMinutes(scheduledTime.getMinutes() - n.offsetMinutes);

          if (
            now >= scheduledTime &&
            (!n.lastTriggeredAt || n.lastTriggeredAt < scheduledTime)
          ) {
            await this.telegram.sendMessage(
              n.user.telegramChatId!,
              `Напоминание: ${n.task.title}`,
            );
            await this.prisma.notification.update({
              where: { id: n.id },
              data: { lastTriggeredAt: now },
            });
          }
        }

        // TODO: добавить обработку AT_RUN, DEADLINE, NO_PROGRESS
      } catch (e) {
        this.logger.error(`Failed to send notification ${n.id}: ${e}`);
      }
    }
  }
}
