import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from 'src/decorator/user.decorator';
import { GamificationService } from './gamification.service';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('gamification')
@Controller('gamification')
export class GamificationController {
    constructor(private gamificationService: GamificationService) { }

    @Get('progress')
    @UseGuards(AccessTokenGuard)
    @ApiOperation({ summary: 'Прогресс пользователя (xp, level, streak, etc)' })
    async getProgress(@CurrentUser('id') id: number) {
        return this.gamificationService.getProgress(id)
    }

    @Get('leaderboard/:period')
    @ApiOperation({ summary: 'Leaderboard для периода (all_time, week_xxx)' })
    async getLeaderboard(@Param('period') period: string) {
        return this.gamificationService.getLeaderboard(period)
    }
}
