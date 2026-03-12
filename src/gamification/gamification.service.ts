import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TODO_COMPLETED_EVENT, TodoCompletedPayload } from './events/gamification.events';
import { AchievementService } from './achievement/achievement.service';

@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
        private achievementService: AchievementService,
    ) { }

    // вызывается внешним кодом (например, в TodoService после успешного закрытия)
    async onTodoCompleted(payload: TodoCompletedPayload) {
        // 1) запишем событие в очередь/таблицу для идемпотентности и отладки
        const ev = await this.prisma.gamificationEvent.create({
            data: {
                type: 'TODO_COMPLETED',
                userId: payload.userId,
                payload: payload as any,
            },
        });

        // emit локально, worker/обработчик подпишется
        this.eventEmitter.emit(TODO_COMPLETED_EVENT, { id: ev.id, ...payload });
    }

    // helper: начислить XP (и сделать транзакцию)
    async addXp(userId: number, amount: number, reason = 'TODO_COMPLETED', reference?: { id?: number; type?: string }) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: {
                    xp: { increment: amount },
                },
            });

            // опционально - пересчитать уровень по формуле
            const level = this.calculateLevel(user.xp + 0); // user.xp уже обновлён? Prisma возвращает новое значение
            await tx.user.update({
                where: { id: userId },
                data: { level },
            });

            await tx.pointsTransaction.create({
                data: {
                    userId,
                    amount,
                    //@ts-ignore
                    reason,
                    referenceId: reference?.id,
                    referenceType: reference?.type,
                },
            });

            return { userId, xp: user.xp, level };
        });
    }

    calculateLevel(xp: number) {
        // простая кривая: каждые 100 xp = 1 уровень (пример)
        return Math.floor(xp / 100) + 1;
    }

    // обновление streak и totalCompletedTasks
    async processTodoCompletion(userId: number, taskId: number, completedAt?: string) {
        const now = completedAt ? new Date(completedAt) : new Date();

        return this.prisma.$transaction(async (tx) => {
            // увеличим totalCompletedTasks
            await tx.user.update({
                where: { id: userId },
                data: {
                    totalCompletedTasks: { increment: 1 },
                },
            });

            // Update or create streak row
            const streak = await tx.userStreak.findUnique({ where: { userId } });
            if (!streak) {
                await tx.userStreak.create({
                    data: {
                        userId,
                        currentStreak: 1,
                        bestStreak: 1,
                        lastActiveAt: now,
                    },
                });
            } else {
                // если lastActiveAt был вчера, инкремент; если сегодня — ничего; иначе сброс
                const last = streak.lastActiveAt ?? new Date(0);
                const sameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

                if (sameDay(last, now)) {
                    // уже засчитан за сегодня — ничего
                } else if (sameDay(last, yesterday)) {
                    // продолжение streak
                    const cur = streak.currentStreak + 1;
                    await tx.userStreak.update({
                        where: { userId },
                        data: {
                            currentStreak: cur,
                            bestStreak: Math.max(streak.bestStreak, cur),
                            lastActiveAt: now,
                        },
                    });
                } else {
                    // сброс
                    await tx.userStreak.update({
                        where: { userId },
                        data: {
                            currentStreak: 1,
                            lastActiveAt: now,
                        },
                    });
                }
            }

            // начислим XP (пример: +10)
            await tx.pointsTransaction.create({
                data: {
                    userId,
                    amount: 10,
                    reason: 'TODO_COMPLETED',
                    referenceId: taskId,
                    referenceType: 'TASK',
                },
            });

            // обновим user.xp и level
            const user = await tx.user.findUnique({ where: { id: userId } });
            //@ts-ignore
            const newXp = (user.xp ?? 0) + 10;
            const newLevel = this.calculateLevel(newXp);
            await tx.user.update({
                where: { id: userId },
                data: {
                    xp: newXp,
                    level: newLevel,
                },
            });
        });
    }


    async getProgress(userId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        const streak = await this.prisma.userStreak.findUnique({ where: { userId: userId } });
        const badges = await this.prisma.userBadge.findMany({ where: { userId: userId }, include: { badge: true } });
        const achievements = await this.prisma.userAchievement.findMany({ where: { userId: userId }, include: { achievement: true } });
        return {
            xp: user.xp,
            level: user.level,
            streak: streak?.currentStreak ?? 0,
            bestStreak: streak?.bestStreak ?? 0,
            totalCompletedTasks: user.totalCompletedTasks,
            badges,
            achievements,
        };
    }

    async getLeaderboard(period: string) {
        const entries = await this.prisma.leaderboardEntry.findMany({
            where: { period },
            orderBy: { rank: 'asc' },
            include: { user: true },
        });
        return entries;
    }


    // вызов checkAchievements (делегируем на AchievementService)
    async checkAchievementsForUser(userId: number) {
        return this.achievementService.evaluateAndUnlock(userId);
    }
}
