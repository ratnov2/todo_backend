import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { CreateBadgeAnimationDto } from './dto/create-badge-animation.dto';

@Injectable()
export class BadgeService {
    private readonly logger = new Logger(BadgeService.name);

    constructor(private prisma: PrismaService) { }

    async create(dto: CreateBadgeDto) {
        return this.prisma.badge.create({
            data: dto,
        });
    }

    async findAll() {
        return this.prisma.badge.findMany();
    }

    async findByCode(code: string) {
        return this.prisma.badge.findFirst({ where: { code } });
    }

    async findOne(id: number) {
        return this.prisma.badge.findUnique({ where: { id } });
    }

    async update(id: number, dto: UpdateBadgeDto) {
        await this.ensureExists(id);
        return this.prisma.badge.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: number) {
        await this.ensureExists(id);
        return this.prisma.badge.delete({ where: { id } });
    }

    async addAnimation(badgeId: number, dto: CreateBadgeAnimationDto) {
        await this.ensureExists(badgeId);
        return this.prisma.badgeAnimation.create({
            data: {
                type: dto.type,
                asset: dto.assetUrl,
                metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
            },
        });
    }

    private async ensureExists(id: number) {
        const b = await this.prisma.badge.findUnique({ where: { id } });
        if (!b) throw new NotFoundException('Badge not found');
    }

    async assignBadgeToUser(userId: number, badgeId: number) {
        try {
            return await this.prisma.userBadge.create({
                data: { userId, badgeId, animationState: 'not_shown' },
            });
        } catch (e) {
            // unique constraint - уже есть
            this.logger.warn('assignBadgeToUser: ' + e.message);
            return null;
        }
    }

    async setAnimationState(userBadgeId: number, state: string) {
        return this.prisma.userBadge.update({
            where: { id: userBadgeId },
            data: { animationState: state },
        });
    }
}
