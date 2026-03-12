import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification.service';
import { TODO_COMPLETED_EVENT, TodoCompletedPayload } from '../events/gamification.events';

@Injectable()
export class GamificationWorker {
    private readonly logger = new Logger(GamificationWorker.name);

    constructor(private prisma: PrismaService, private gamificationService: GamificationService) { }

    @OnEvent(TODO_COMPLETED_EVENT, { async: true })
    async handleTodoCompleted(payload: TodoCompletedPayload & { id?: number }) {
        try {
            // помечаем gamificationEvent как processing/processed + идемпотентность
            if (payload.id) {
                const ev = await this.prisma.gamificationEvent.findUnique({ where: { id: payload.id } });
                if (!ev || ev.processed) {
                    this.logger.debug('Event already processed or not found: ' + payload.id);
                    return;
                }
                // пометить processed true до выполнения? лучше - в конце. но можно пометить lock.
            }

            // 1) выполнить процессинг: update streak, total tasks, add xp/points
            await this.gamificationService.processTodoCompletion(payload.userId, payload.taskId, payload.completedAt);

            // 2) проверить ачивки
            await this.gamificationService.checkAchievementsForUser(payload.userId);

            // 3) пометить событие processed
            if (payload.id) {
                await this.prisma.gamificationEvent.update({
                    where: { id: payload.id },
                    data: { processed: true, processedAt: new Date() },
                });
            }
        } catch (e) {
            this.logger.error('Error handling todo.completed', e);
            if (payload.id) {
                await this.prisma.gamificationEvent.update({
                    where: { id: payload.id },
                    data: { error: e.message?.slice(0, 200) },
                });
            }
        }
    }
}
