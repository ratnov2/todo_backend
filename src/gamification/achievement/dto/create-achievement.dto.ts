import { ApiProperty } from '@nestjs/swagger';
import { AchievementType } from '@prisma/client';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateAchievementDto {
    @ApiProperty({ example: 'FIRST_TASK' })
    @IsString()
    code: string;

    @ApiProperty({ example: 'Первый шаг' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Выполни первую задачу', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'ONE_TIME', required: false })
    @IsOptional()
    @IsString()
    type?: AchievementType;

    @ApiProperty({ example: 50, required: false })
    @IsOptional()
    @IsNumber()
    xpReward?: number;

    @ApiProperty({ example: 20, required: false })
    @IsOptional()
    @IsNumber()
    pointsReward?: number;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @IsNumber()
    badgeId?: number;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
