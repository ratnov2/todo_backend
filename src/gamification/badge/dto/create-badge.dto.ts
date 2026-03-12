import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class CreateBadgeDto {
    @ApiProperty({ example: 'BADGE_EPIC_1' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Epic Finisher' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Finish 50 tasks', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'https://cdn.example.com/badges/1.png' })
    @IsString()
    icon: string;

    // @ApiProperty({ example: 'EPIC', enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] })
    // @IsString()
    // @IsIn(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
    // rarity: string;
}
