import { IsNumber } from 'class-validator';

export class SendRequestDto {
  @IsNumber()
  friendId: number;
}
