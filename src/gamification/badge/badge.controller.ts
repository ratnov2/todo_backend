import { Controller, Get, Post, Param, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { CreateBadgeAnimationDto } from './dto/create-badge-animation.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/role.guard';
import { Roles } from 'src/decorator/role.decorator';
import { Role } from '@prisma/client';

@ApiTags('badges')
@Controller('badges')
export class BadgeController {
    constructor(private svc: BadgeService) { }

    @Post(':id/assign/:userId')
    @UseGuards(AccessTokenGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Выдать бейдж пользователю (admin)' })
    assign(@Param('id') id: string, @Param('userId') userId: string) {
        return this.svc.assignBadgeToUser(+userId, +id);
    }

    @Post()
    @UseGuards(AccessTokenGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create badge' })
    create(@Body() dto: CreateBadgeDto) {
        return this.svc.create(dto);
    }

    @Post(':id/animation')
    @UseGuards(AccessTokenGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Attach animation to badge' })
    attachAnimation(@Param('id') id: string, @Body() dto: CreateBadgeAnimationDto) {
        return this.svc.addAnimation(+id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List badges' })
    list() { return this.svc.findAll(); }

    @Get(':id')
    get(@Param('id') id: string) { return this.svc.findOne(+id); }

    @Patch(':id')
    @UseGuards(AccessTokenGuard, RolesGuard)
    @Roles(Role.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateBadgeDto) { return this.svc.update(+id, dto); }

    @Delete(':id')
    @UseGuards(AccessTokenGuard, RolesGuard)
    @Roles(Role.ADMIN)
    remove(@Param('id') id: string) { return this.svc.remove(+id); }
}
