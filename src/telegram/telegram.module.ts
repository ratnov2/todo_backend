import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Module({
  providers: [TelegramService],
  exports: [TelegramService],
  controllers: [TelegramController], // обязательно экспортируем, чтобы другие модули могли использовать
})
export class TelegramModule {}
