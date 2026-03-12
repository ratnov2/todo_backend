// notification/notification.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './ts/create-notification.dto';
import { CurrentUser } from 'src/decorator/user.decorator';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  create(@CurrentUser('id') id: number, @Body() body: CreateNotificationDto) {
    return this.service.create(id, body);
  }

  @Post(':id/test')
  @UseGuards(AccessTokenGuard)
  test(@Param('id', ParseIntPipe) notificationId: number) {
    return this.service.sendTest(notificationId);
  }
}
