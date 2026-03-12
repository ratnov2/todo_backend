import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AchievementRuleEngine {
    private readonly logger = new Logger(AchievementRuleEngine.name);

    constructor(private prisma: PrismaService) { }

    // возвращает true если все обязательные критерии выполнены
    async evaluateAchievement(achievement: any, context: any): Promise<boolean> {
        // each criterion has type and params (JSON)
        const criteria = achievement.criteria || [];
        for (const c of criteria) {
            const ok = await this.evaluateCriterion(c, context);
            if (c.isRequired && !ok) return false;
        }
        // если все обязательные пройдены — true
        return true;
    }

    async evaluateCriterion(criterion: any, context: any): Promise<boolean> {
        const type = criterion.type;
        const params = criterion.params || {};

        switch (type) {
            case 'COMPLETE_TASKS': {
                // params: { target: number }
                const target = params.target ?? 1;
                const user = context.user;
                if (!user) return false;
                return (user.totalCompletedTasks ?? 0) >= target;
            }
            case 'STREAK_DAYS': {
                // params: { days: number }
                const days = params.days ?? 1;
                const streak = context.streak;
                if (!streak) return false;
                return (streak.currentStreak ?? 0) >= days;
            }
            case 'USE_FEATURE': {
                // params: { feature: 'AI_SUGGESTION', times: 1 }
                // в этой реализации предполагаем наличие таблицы или счетчика в activityFeed/points
                const feature = params.feature;
                const times = params.times ?? 1;
                // пример: ищем activityFeedItems
                const count = await this.prisma.activityFeedItem.count({
                    where: { userId: context.user.id, type: feature },
                });
                return count >= times;
            }
            case 'COMPLETE_TASK_WITH_TAG': {
                // params: { tag: 'onboarding', target: 1 }
                const tag = params.tag;
                const target = params.target ?? 1;
                // предполагаем, что у Task есть tags relation (в твоей схеме нет — нужно добавить) - fallback: false
                const count = await this.prisma.task.count({
                    where: {
                        ownerId: context.user.id,
                        status: 'done',
                        // tags: { some: { name: tag } } // если есть relation
                    },
                });
                return count >= target;
            }
            case 'PROGRESS_TARGET': {
                // params: { taskId: 123, targetValue: 100 }
                const taskId = params.taskId;
                const targetValue = params.targetValue;
                if (!taskId || !targetValue) return false;
                const sum = await this.prisma.progressEntry.aggregate({
                    _sum: { amount: true },
                    where: { taskId, actorId: context.user.id },
                });
                const val = (sum._sum.amount ?? 0);
                return val >= targetValue;
            }
            default:
                this.logger.warn('Unknown criterion type: ' + type);
                return false;
        }
    }
}
