import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class NotifyChangeDto {
  @IsBoolean()
  @ApiProperty({ example: true, description: 'isEnabled' })
  isEnabled: boolean;
}
