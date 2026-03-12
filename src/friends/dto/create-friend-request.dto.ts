import { IsNumber } from 'class-validator';

export class CreateFriendRequestDto {
  @IsNumber()
  friendId: number;
}
