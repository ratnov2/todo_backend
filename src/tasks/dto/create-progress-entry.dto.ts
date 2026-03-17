import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProgressEntryDto {
  @IsNumber()
  @ApiProperty({ example: 100, description: 'Amount of progress' })
  amount: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    example: 138,
    description:
      'Task instance ID (bind progress to currentInstance when provided)',
  })
  taskInstanceId?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1, description: 'Actor ID' })
  actorId?: number;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({ example: '2026-01-22T10:00:00.000Z', description: 'Group date' })
  groupDate?: string;

  @IsOptional()
  @IsString() 
  @ApiPropertyOptional({ example: 'Some note for the progress entry', description: 'Note' })
  note?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1, description: 'Task progress ID' })
  taskProgressId?: number; // link to specific TaskProgress
}
