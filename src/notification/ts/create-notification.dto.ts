import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @IsNumber()
  @ApiProperty({ example: 1, description: 'Task ID' })
  taskId: number;

  @IsEnum(NotificationType)
  @ApiProperty({
    example: 'BEFORE_RUN',
    description: 'Notification type',
    enum: NotificationType,
  })
  type: NotificationType;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 10, description: 'Offset minutes' })
  offsetMinutes?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 10, description: 'No progress days' })
  noProgressDays?: number;
}
