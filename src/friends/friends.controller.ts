import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Get,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { FriendsService } from './friends.service';

import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { BlockDto } from './dto/block.dto';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorator/user.decorator';

@UseGuards(AccessTokenGuard)
@Controller('friends')
export class FriendsController {
  constructor(private svc: FriendsService) {}

  @Post('request')
  async sendRequest(
    @CurrentUser('id') id: number,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.svc.sendRequest(id, dto);
  }

  @Post(':id/accept')
  async accept(
    @CurrentUser('id') id: number,
    @Param('id', ParseIntPipe) friendId: number,
  ) {
    return this.svc.acceptRequest(id, friendId);
  }

  @Post(':id/reject')
  async reject(
    @CurrentUser('id') id: number,
    @Param('id', ParseIntPipe) rejectId: number,
  ) {
    return this.svc.rejectRequest(id, rejectId);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('id') id: number,
    @Param('id', ParseIntPipe) deleteId: number,
  ) {
    return this.svc.removeFriend(id, deleteId);
  }

  @Post('block')
  async block(@CurrentUser('id') id: number, @Body() dto: BlockDto) {
    return this.svc.blockUser(id, dto.targetId);
  }

  @Get()
  async list(@CurrentUser('id') id: number) {
    return this.svc.listFriends(id);
  }

  @Get('requests')
  async requests(@CurrentUser('id') id: number) {
    return this.svc.listRequests(id);
  }
}
