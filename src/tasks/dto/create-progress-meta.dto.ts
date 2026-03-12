import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressAggregation } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaskProgressDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 100, description: 'Target value' })
  targetValue?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'steps', description: 'Unit', enum: ['steps', 'pages', 'points'] })
  unit?: string;

  @IsOptional()
  @IsEnum(ProgressAggregation)
  @ApiPropertyOptional({ example: 'TOTAL', description: 'Aggregation', enum: ProgressAggregation })
  aggregation?: ProgressAggregation;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true, description: 'Is cumulative (true by default)' })
  isCumulative?: boolean;
}
