import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsBoolean, IsOptional } from 'class-validator';

export class CreateAchievementCriterionDto {
  @ApiProperty({ example: 'COMPLETE_TASKS' })
  @IsString()
  type: string;

  @ApiProperty({ example: { target: 10 } })
  @IsObject()
  params: Record<string, any>;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
