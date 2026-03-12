import { ApiProperty } from '@nestjs/swagger';
import { AnimationType } from '@prisma/client';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateBadgeAnimationDto {
    @ApiProperty({ example: 'LOTTIE', enum: ['LOTTIE', 'GIF', 'SPRITE_SHEET'] })
    @IsString()
    type: AnimationType;

    @ApiProperty({ example: 'https://cdn.example.com/animations/badge_1.json' })
    @IsString()
    assetUrl: string;

    @ApiProperty({ example: 2000, required: false })
    @IsOptional()
    @IsNumber()
    durationMs?: number;

    @ApiProperty({ example: '{"loop": false}', required: false })
    @IsOptional()
    @IsString()
    metadata?: string;
}
