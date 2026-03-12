import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { BadgeService } from '../badge/badge.service';
import { AchievementRuleEngine } from './achievement-rule-engine';
import { Achievement } from '@prisma/client';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { CreateAchievementCriterionDto } from './dto/create-achievement-criterion.dto';

@Injectable()
export class AchievementService {
    private readonly logger = new Logger(AchievementService.name);

    constructor(
        private prisma: PrismaService,
        private ruleEngine: AchievementRuleEngine,
        private badgeService: BadgeService,
    ) { }

    async create(dto: CreateAchievementDto) {
        return this.prisma.achievement.create({
            data: dto,
        });
    }

    async findAll() {
        return this.prisma.achievement.findMany({ include: { badge: true, criteria: true } });
    }

    async findOne(id: number) {
        return this.prisma.achievement.findUnique({ where: { id }, include: { criteria: true, badge: true } });
    }

    async findByCode(code: string) {
        return this.prisma.achievement.findFirst({ where: { code }, include: { criteria: true } });
    }

    async update(id: number, dto: UpdateAchievementDto) {
        await this.ensureExists(id);
        return this.prisma.achievement.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: number) {
        await this.ensureExists(id);
        return this.prisma.achievement.delete({ where: { id } });
    }

    async addCriterion(achievementId: number, dto: CreateAchievementCriterionDto) {
        await this.ensureExists(achievementId);
        return this.prisma.achievementCriterion.create({
            data: {
                achievementId,
                type: dto.type,
                params: dto.params,
                isRequired: dto.isRequired ?? true,
            },
        });
    }

    async listCriteria(achievementId: number) {
        return this.prisma.achievementCriterion.findMany({ where: { achievementId } });
    }

    async deleteCriterion(criterionId: number) {
        return this.prisma.achievementCriterion.delete({ where: { id: criterionId } });
    }

    private async ensureExists(id: number) {
        const a = await this.prisma.achievement.findUnique({ where: { id } });
        if (!a) throw new NotFoundException('Achievement not found');
    }

    // основной метод: проверить все активные ачивки и открыть те, что соответствуют
    async evaluateAndUnlock(userId: number) {
        // загрузим все активные achievements
        const achievements = await this.prisma.achievement.findMany({
            where: { isActive: true },
            include: { criteria: true, badge: true },
        });

        // загрузим snapshot данных пользователя, которые могут понадобиться при проверке
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const streak = await this.prisma.userStreak.findUnique({ where: { userId } });

        // загрузим статистики (например: completed tasks count)
        // но в нашей схеме есть totalCompletedTasks at user
        const context = {
            user,
            streak,
            // можно подгрузить другие вещи: completed tasks by tag, progress totals, etc.
        };

        for (const ach of achievements) {
            const already = await this.prisma.userAchievement.findUnique({
                where: { userId_achievementId: { userId, achievementId: ach.id } }
            });

            // если one-time и уже есть — пропускаем
            if (already && ach.type === 'ONE_TIME') continue;

            // evaluate criteria
            const criteriaOk = await this.ruleEngine.evaluateAchievement(ach, context);

            if (criteriaOk) {
                // unlock
                await this.unlockAchievementForUser(userId, ach);
            }
        }
    }

    async forceUnlock(userId: number, id: number) {
        const ach = await this.prisma.achievement.findUnique({ where: { id } });
        if (!ach) throw new NotFoundException('Achievement not found')

        return this.unlockAchievementForUser(userId, ach);
    }

    async unlockAchievementForUser(userId: number, achievement: Achievement) {

        const user = await this.prisma.user.findUnique({ where: { id: userId } })
        if (!user) throw new NotFoundException('User not found')
        const userXp = user.xp || 0
        try {
            const ua = await this.prisma.userAchievement.create({
                data: {
                    userId,
                    achievementId: achievement.id,
                    snapshot: {
                        xp: userXp,
                    },
                },
            });

            // начислим награды (XP / points)
            if (achievement.xpReward) {
                await this.prisma.pointsTransaction.create({
                    data: {
                        userId,
                        amount: achievement.xpReward,
                        reason: 'ACHIEVEMENT_UNLOCKED',
                        referenceId: achievement.id,
                        referenceType: 'ACHIEVEMENT',
                    },
                });
                // обновим user.xp и level
                const user = await this.prisma.user.findUnique({ where: { id: userId } });
                const newXp = userXp + (achievement.xpReward ?? 0);
                const newLevel = Math.floor(newXp / 100) + 1;
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { xp: newXp, level: newLevel, achievementsCount: { increment: 1 } },
                });
            }

            if (achievement.pointsReward) {
                await this.prisma.pointsTransaction.create({
                    data: {
                        userId,
                        amount: achievement.pointsReward,
                        reason: 'ACHIEVEMENT_UNLOCKED',
                        referenceId: achievement.id,
                        referenceType: 'ACHIEVEMENT',
                    },
                });
            }

            // если achievement связан с badge — выдать badge
            if (achievement.badgeId) {
                await this.badgeService.assignBadgeToUser(userId, achievement.badgeId);
            }

            // add feed item
            await this.prisma.activityFeedItem.create({
                data: {
                    userId,
                    type: 'ACHIEVEMENT_UNLOCKED',
                    body: { achievementCode: achievement.code, title: achievement.title },
                    isPublic: true,
                },
            });

        } catch (e) {
            // если unique violation — игнорируем (уже выдано)
            this.logger.warn('unlockAchievementForUser: ' + e.message);
        }
    }
}
