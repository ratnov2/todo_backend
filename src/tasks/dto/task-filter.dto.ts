import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsArray, ArrayNotEmpty, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskStatus, TaskType } from '@prisma/client';

export enum TaskSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class TaskQueryFilterDto {
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : [value]
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TaskStatus, { each: true })
  @ApiPropertyOptional({
    example: ['pending', 'inProgress'],
    description: 'Task status (can select multiple)',
    enum: TaskStatus,
    isArray: true,
  })
  status?: TaskStatus[];

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : [value]
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TaskType, { each: true })
  @ApiPropertyOptional({
    example: ['ONCE', 'DEADLINE'],
    description: 'Task type (can select multiple)',
    enum: TaskType,
    isArray: true,
  })
  type?: TaskType[];

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : [value]
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number) // обязательно для преобразования query params из строк в числа
  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Owner IDs (can select multiple)',
    type: [Number],
  })
  ownerId?: number[];

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-01-22T00:00:00.000Z', description: 'Start date filter' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-01-22T23:59:59.999Z', description: 'End date filter' })
  endDate?: string;

  @IsOptional()
  @ApiPropertyOptional({ example: TaskSort.NEWEST, description: 'Sort tasks' })
  sort?: TaskSort;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Task title', description: 'Text search for title/description' })
  q?: string;
}
