import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LevelsService } from './levels.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { AddXpDto } from './dto/add-xp.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/decorator/role.decorator';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/role.guard';
import { Role } from '@prisma/client';

@ApiTags('levels')
@Controller('levels')
export class LevelsController {
  constructor(private svc: LevelsService) {}

  // public read-only
  @Get()
  list() {
    return this.svc.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  // admin CRUD
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateLevelDto) {
    return this.svc.create(dto);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.svc.update(+id, dto);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(+id);
  }

  // ========================
  // XP endpoints for users
  // ========================
  // добавить XP пользователю и пересчитать уровень
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/user/:id/xp')
  @ApiOperation({ summary: 'Добавить XP пользователю (и пересчитать уровень)' })
  addXpToUser(@Param('id') id: string, @Body() dto: AddXpDto) {
    return this.svc.addXpToUser(+id, dto.amount);
  }

  // рекалькулировать уровень пользователя (админ)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/user/:id/recalc')
  recalc(@Param('id') id: string) {
    return this.svc.recalcUserLevel(+id);
  }
}
