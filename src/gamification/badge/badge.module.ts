import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgeController } from './badge.controller';
import { BadgeService } from './badge.service';

@Module({
  controllers: [BadgeController],
  providers: [PrismaService, BadgeService],
  exports: [BadgeService],
})
export class BadgeModule {}
