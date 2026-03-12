import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/decorator/user.decorator';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';
import { TelegramService } from './telegram.service';
import { NotifyChangeDto } from './dto/notify-change.dto';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}
  @Post('telegram/link')
  @UseGuards(AccessTokenGuard)
  async createLink(@CurrentUser('id') id: number) {
    const token = crypto.randomUUID();
    return this.telegramService.createLink(id, token);
  }

  @Post('disconnect')
  @UseGuards(AccessTokenGuard)
  disconnect(@CurrentUser('id') id: number) {
    return this.telegramService.disconnect(id);
  }

  @Patch('notify_change')
  @UseGuards(AccessTokenGuard)
  notifyChange(@CurrentUser('id') id: number, @Body() dto: NotifyChangeDto) {
    return this.telegramService.notifyTgChange(id, dto.isEnabled);
  }
}
