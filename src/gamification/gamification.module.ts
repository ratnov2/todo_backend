import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { AchievementModule } from './achievement/achievement.module';
import { BadgeModule } from './badge/badge.module';

import { BadgeController } from './badge/badge.controller';
import { BadgeService } from './badge/badge.service';
import { GamificationWorker } from './worker/gamification.worker';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AchievementModule,
    BadgeModule,
  ],
  controllers: [GamificationController, BadgeController],
  providers: [PrismaService, GamificationService, GamificationWorker, BadgeService],
  exports: [GamificationService],
})
export class GamificationModule { }
