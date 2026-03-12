import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LevelsService {
  constructor(private prisma: PrismaService) {}

  // CRUD for levels (admin)
  findAll() {
    return this.prisma.level.findMany({ orderBy: { level: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.level.findUnique({ where: { id } });
  }

  findByLevelNumber(levelNum: number) {
    return this.prisma.level.findUnique({ where: { level: levelNum } });
  }

  async create(dto) {
    return this.prisma.level.create({ data: dto });
  }

  async update(id: number, dto) {
    await this.ensureExists(id);
    return this.prisma.level.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.prisma.level.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const l = await this.prisma.level.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Level not found');
  }

  // =======================
  // XP / leveling logic
  // =======================

  // Добавить XP пользователю и пересчитать уровень
  async addXpToUser(userId: number, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const newXp = (user.xp ?? 0) + amount;

      // Найдём подходящий уровень: максимальный level, где xpNeeded <= newXp
      const levelRow = await tx.level.findFirst({
        where: { xpNeeded: { lte: newXp } },
        orderBy: { level: 'desc' },
      });

      const newLevel = levelRow ? levelRow.level : 1;

      const updated = await tx.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
      });

      // Запишем транзакцию/лог очков (если у тебя есть PointsTransaction)
      await tx.pointsTransaction
        .create({
          data: {
            userId,
            amount,
            reason: 'TODO_COMPLETED', // или проксировать reason
            createdAt: new Date(),
          },
        })
        .catch(() => {
          /* если нет таблицы, игнор */
        });

      return updated;
    });
  }

  // Рекалькулировать уровень пользователя по текущему xp (например при изменении таблицы уровней)
  async recalcUserLevel(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const levelRow = await this.prisma.level.findFirst({
      where: { xpNeeded: { lte: user.xp ?? 0 } },
      orderBy: { level: 'desc' },
    });

    const newLevel = levelRow ? levelRow.level : 1;
    if (newLevel !== user.level) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
    }
    return { userId, level: newLevel };
  }
}
