import {
  IsOptional,
  IsISO8601,
  IsString,
  IsArray,
  IsInt,
  IsEnum,
} from 'class-validator';
import { TaskType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @IsOptional()
  @IsEnum(TaskType)
  @ApiProperty({ example: 'SCHEDULED', description: 'Type', enum: TaskType })
  type: TaskType;

  @IsOptional()
  @IsISO8601()
  @ApiProperty({ example: '2026-01-22T10:00:00.000Z', description: 'Run at' })
  runAt: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '10:00', description: 'Time of day' })
  timeOfDay?: string; // 'HH:MM'

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ApiPropertyOptional({ example: [1, 2, 3], description: 'Days of week' })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1, description: 'Day of month' })
  dayOfMonth?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '0 0 * * *', description: 'Cron expression' })
  cronExpression?: string;
}
