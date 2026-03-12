import { IsNumber } from 'class-validator';

export class RespondFriendRequestDto {
  @IsNumber()
  friendshipId: number;
}
