import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [NotificationController],
  providers: [NotificationService]
})
export class NotificationModule {}
