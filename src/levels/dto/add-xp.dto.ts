import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AddXpDto {
  @ApiProperty({ example: 50 })
  @IsInt()
  amount: number;
}
