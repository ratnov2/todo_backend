import { Controller, Get, Param, Post, Body, ParseIntPipe, UseGuards, Patch, Delete } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/role.guard';
import { Roles } from 'src/decorator/role.decorator';
import { Role } from '@prisma/client';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { CreateAchievementCriterionDto } from './dto/create-achievement-criterion.dto';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementController {
    constructor(private svc: AchievementService) { }

    @Post()
    @ApiOperation({ summary: 'Create achievement' })
    create(@Body() dto: CreateAchievementDto) {
        return this.svc.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List achievements' })
    list() { return this.svc.findAll(); }

    @Get(':id')
    get(@Param('id', ParseIntPipe) id: number) {
        return this.svc.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update achievement' })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAchievementDto) {
        return this.svc.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.svc.remove(id);
    }

    // criteria
    @Post(':id/criteria')
    @ApiOperation({ summary: 'Add criterion to achievement' })
    addCriterion(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateAchievementCriterionDto) {
        return this.svc.addCriterion(id, dto);
    }

    @Get(':id/criteria')
    listCriteria(@Param('id', ParseIntPipe) id: number) {
        return this.svc.listCriteria(id);
    }

    @Delete('/criteria/:criterionId')
    deleteCriterion(@Param('criterionId', ParseIntPipe) criterionId: number) {
        return this.svc.deleteCriterion(criterionId);
    }

    @UseGuards(AccessTokenGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Post(':id/unlock/:userId')
    @ApiOperation({ summary: 'Принудительно открыть ачивку пользователю (admin)' })
    async forceUnlock(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) {
        return this.svc.forceUnlock(userId, id)
    }
}
