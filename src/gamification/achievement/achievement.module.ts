import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';

import { BadgeModule } from '../badge/badge.module';
import { AchievementRuleEngine } from './achievement-rule-engine';

@Module({
  imports: [BadgeModule],
  controllers: [AchievementController],
  providers: [PrismaService, AchievementService, AchievementRuleEngine],
  exports: [AchievementService],
})
export class AchievementModule { }
