import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateLevelDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  level: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  xpNeeded: number;

  @ApiProperty({ example: 'Beginner', required: false })
  @IsOptional()
  @IsString()
  title?: string;
}
