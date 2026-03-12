import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';

export class CreateTaskDto {
  @IsString({ message: 'Field title is required' })
  @ApiProperty({ example: 'Task title', description: 'Task title' })
  title: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Task description',
    description: 'Task description',
  })
  description?: string;

  @IsOptional()
  @IsEnum(TaskType)
  @ApiPropertyOptional({
    example: 'ONCE',
    description: 'Task type',
    enum: TaskType,
  })
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskStatus)
  @ApiPropertyOptional({
    example: 'pending',
    description: 'Task status',
    enum: TaskStatus,
  })
  status?: TaskStatus;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1, description: 'Task priority' })
  priority?: number;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-01-22T10:00:00.000Z',
    description: 'Scheduled for',
  })
  scheduledFor?: string; // ISO date string

  @IsOptional()
  schedule?: CreateScheduleDto;
}
