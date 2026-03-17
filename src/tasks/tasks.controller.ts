import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryFilterDto } from './dto/task-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateTaskProgressDto } from './dto/create-progress-meta.dto';
import { CreateProgressEntryDto } from './dto/create-progress-entry.dto';
import { AccessTokenGuard } from 'src/guards/jwt-auth.guard';
import * as cron from 'node-cron';

import {
  type Pagination,
  PaginationParams,
} from 'src/decorator/pagination.decorator';
import { CurrentUser } from 'src/decorator/user.decorator';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { TaskStatus } from '@prisma/client';
import { BulkUpdateStatusDto } from './dto/bulk-task.dto';
import { UpdateTaskInstanceDto } from './dto/update-instance.dto';

@Controller('tasks')
@UseGuards(AccessTokenGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {
    this.generateInstances();
    this.checkedTasks();
  }

  @Post()
  create(
    @CurrentUser('id') ownerId: number,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(ownerId, createTaskDto);
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  findAll(
    @CurrentUser('id') ownerId: number,
    @PaginationParams() pagination: Pagination,
    @Query() query: TaskQueryFilterDto,
  ) {
    return this.tasksService.findAll(pagination, query, ownerId);
  }

  @UseGuards(AccessTokenGuard)
  @Get('stats')
  async getStats(@CurrentUser('id') ownerId: number) {
    return this.tasksService.getStats(ownerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }

  @Get(':id/stats')
  getTaskStats(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.getTaskStats(id);
  }

  // schedules
  @Post(':id/schedules')
  addSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.tasksService.addSchedule(id, dto);
  }

  @Patch('schedules/:id')
  updateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.tasksService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  removeSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.removeSchedule(id);
  }

  // subtasks
  @Post(':id/subtasks')
  createSubtask(
    @Param('id', ParseIntPipe) taskId: number,
    @CurrentUser('id') ownerId: number,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.createSubtask(taskId, ownerId, dto);
  }

  // linking tasks
  @Post(':id/links/:otherId')
  linkTasks(
    @Param('id', ParseIntPipe) id: number,
    @Param('otherId', ParseIntPipe) otherId: number,
  ) {
    return this.tasksService.linkTasks(id, otherId);
  }

  @Delete(':id/links/:otherId')
  unlinkTasks(
    @Param('id', ParseIntPipe) id: number,
    @Param('otherId', ParseIntPipe) otherId: number,
  ) {
    return this.tasksService.unlinkTasks(id, otherId);
  }

  // progress meta
  @Post(':id/progress')
  setProgressMeta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTaskProgressDto,
  ) {
    return this.tasksService.setProgressMeta(id, dto);
  }

  @Post(':id/progress/entries')
  addProgressEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProgressEntryDto,
  ) {
    return this.tasksService.addProgressEntry(id, dto);
  }

  @Get(':id/progress/entries')
  getProgressEntries(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.getProgressEntries(id);
  }

  // status operations
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: TaskStatus,
  ) {
    return this.tasksService.changeStatus(id, status);
  }

  @Patch('bulk/statuses')
  bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto) {
    return this.tasksService.bulkUpdateStatus(dto.ids, dto.status);
  }

  @Patch('instances/:id')
  updateInstance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskInstanceDto,
  ) {
    return this.tasksService.updateInstance(id, dto);
  }

  private generateInstances() {
    cron.schedule('*/5 * * * *', async () => {
      console.log('generateInstances');
      await this.tasksService.generateInstances();
    });
  }

  private checkedTasks() {
    cron.schedule('*/5 * * * * *', async () => {
      console.log('checkedTasks');
      await this.tasksService.markMissedInstances();
    });
  }
}
