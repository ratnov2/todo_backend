import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProgressEntry,
  Task,
  TaskInstance,
  TaskProgress,
  TaskSchedule,
  TaskStatus,
} from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  PaginatedResource,
  Pagination,
} from 'src/decorator/pagination.decorator';
import { TaskQueryFilterDto } from './dto/task-filter.dto';
import { userSelect } from 'src/users/select/user.select';
import { taskSelect } from './select/task.select';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTaskProgressDto } from './dto/create-progress-meta.dto';
import { CreateProgressEntryDto } from './dto/create-progress-entry.dto';
import { TaskStatsDto } from './dto/task-stats.dto';
import { computeNextOccurrence } from './utils/utils';
import { UpdateTaskInstanceDto } from './dto/update-instance.dto';

@Injectable()
export class TasksService {
  constructor(private db: PrismaService) {}

  // Create a new task
  async create(ownerId: number, createDto: CreateTaskDto): Promise<Task> {
    return this.db.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: createDto.title,
          description: createDto.description ?? null,
          type: createDto.type ?? undefined,
          status: createDto.status ?? undefined,
          priority: createDto.priority ?? 0,
          owner: { connect: { id: ownerId } },
          scheduledFor: createDto.scheduledFor
            ? new Date(createDto.scheduledFor)
            : null,
        },
      });

      if (createDto.schedule) {
        const schedule = await tx.taskSchedule.create({
          data: {
            task: { connect: { id: task.id } },
            type: createDto.schedule.type,
            runAt: createDto.schedule.runAt
              ? new Date(createDto.schedule.runAt)
              : null,
            timeOfDay: createDto.schedule.timeOfDay ?? null,
            daysOfWeek: createDto.schedule.daysOfWeek ?? undefined,
            dayOfMonth: createDto.schedule.dayOfMonth ?? undefined,
            cronExpression: createDto.schedule.cronExpression ?? null,
          },
        });

        const next = computeNextOccurrence(schedule, new Date());
        console.log(next);

        if (next) {
          await tx.taskInstance.create({
            data: {
              task: { connect: { id: task.id } },
              schedule: { connect: { id: schedule.id } },
              occurrenceAt: next,
              dueAt: next,
              status: 'pending',
            },
          });
        }
      }

      return task;
    });
  }

  async completeInstance(
    instanceId: number,
    userId?: number,
    progressAmount?: number,
  ) {
    return this.db.$transaction(async (tx) => {
      const instance = await tx.taskInstance.update({
        where: { id: instanceId },
        data: { status: 'done', completedAt: new Date() },
        include: { task: true, schedule: true },
      });

      // обновить агрегаты
      await tx.task.update({
        where: { id: instance.taskId },
        data: {},
      });

      if (progressAmount !== undefined) {
        await tx.progressEntry.create({
          data: {
            taskId: instance.taskId,
            actorId: userId ?? undefined,
            amount: progressAmount,
          },
        });
      }

      // Опционально: сразу создать следующий экземпляр
      if (instance.scheduleId) {
        const next = computeNextOccurrence(
          instance.schedule as any,
          new Date(instance.occurrenceAt),
        );
        if (next) {
          // защититься от дубликата: проверяем, не существует ли уже такой instance
          const exists = await tx.taskInstance.findFirst({
            where: {
              taskId: instance.taskId,
              scheduleId: instance.scheduleId,
              occurrenceAt: next,
            },
          });
          if (!exists) {
            await tx.taskInstance.create({
              data: {
                task: { connect: { id: instance.taskId } },
                schedule: { connect: { id: instance.scheduleId } },
                occurrenceAt: next,
                dueAt: next,
                status: 'pending',
              },
            });
          }
        }
      }

      return instance;
    });
  }

  // Get list of tasks with filters, pagination, and basic text search
  async findAll(
    pagination: Pagination,
    query: TaskQueryFilterDto,
    ownerId: number,
  ): Promise<PaginatedResource<Partial<Task>>> {
    const { limit, offset, page, size } = pagination;

    const where: Prisma.TaskWhereInput = { ownerId };

    if (query.status) where.status = { in: query.status };
    if (query.type) where.type = { in: query.type };
    if (query.ownerId) where.ownerId = { in: query.ownerId };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [flatItems, totalItems] = await Promise.all([
      this.db.task.findMany({
        where,
        select: {
          ...taskSelect.public,
          parentId: true,
          owner: { select: { id: true } },
        },
        orderBy: { id: 'desc' },
      }),
      this.db.task.count({ where }),
    ]);

    // 🔥 собираем дерево любой глубины
    const tree = this.buildTaskTree(flatItems);

    // пагинация ТОЛЬКО по корневым задачам
    const paginatedRoots = tree.slice(offset, offset + limit);

    if (!paginatedRoots.length)
      return { items: paginatedRoots, totalItems, page, size };

    // 3) Собираем все taskIds из корневых задач + потомков
    const collectTaskIds = (nodes: any[]): number[] => {
      const ids: number[] = [];
      const stack = [...nodes];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (typeof n.id === 'number') ids.push(n.id);
        if (Array.isArray(n.children) && n.children.length)
          stack.push(...n.children);
      }
      return ids;
    };
    const taskIds = collectTaskIds(paginatedRoots);

    const now = new Date();

    // 4) Получаем **только один ближайший instance на задачу**

    const instances = await this.db.taskInstance.findMany({
      where: {
        taskId: { in: taskIds },
        occurrenceAt: { gte: now }, // будущие instance
      },
      orderBy: { occurrenceAt: 'asc' },
    });

    console.log(
      await this.db.taskInstance.findMany({
        where: {
          taskId: 2114,
        },
      }),
    );

    // 5) Создаём карту: taskId → ближайший instance
    const instanceMap = new Map<number, TaskInstance>();
    for (const inst of instances) {
      if (!instanceMap.has(inst.taskId)) {
        instanceMap.set(inst.taskId, inst); // берём **первый (ближайший)**
      }
    }

    // 6) Привязываем instance к дереву рекурсивно
    const attachCurrentInstance = (node: any) => {
      const id = node.id as number | undefined;
      node.currentInstance = id ? (instanceMap.get(id) ?? null) : null;
      if (Array.isArray(node.children))
        node.children.forEach(attachCurrentInstance);
    };
    paginatedRoots.forEach(attachCurrentInstance);

    return { items: paginatedRoots, totalItems, page, size };
  }

  async getTaskStats(taskId: number) {
    const stats = await this.db.taskInstance.groupBy({
      by: ['status'],
      where: { taskId },
      _count: true,
    });

    const result = {
      done: 0,
      failed: 0,
      missed: 0,
    };

    for (const s of stats) {
      if (s.status === 'done') result.done = s._count;
      if (s.status === 'failed') result.failed = s._count;
      if (s.status === 'missed') result.missed = s._count;
    }

    return result;
  }

  private buildTaskTree(tasks: any[]) {
    const map = new Map<number, any>();
    const roots: any[] = [];

    // создаём ноды
    for (const task of tasks) {
      map.set(task.id, { ...task, subtasks: [] });
    }

    // связываем
    for (const task of tasks) {
      if (task.parentId) {
        const parent = map.get(task.parentId);
        if (parent) {
          parent.subtasks.push(map.get(task.id));
        }
      } else {
        roots.push(map.get(task.id));
      }
    }

    return roots;
  }

  async findOne(id: number) {
    const task = await this.db.task.findUnique({
      where: { id },
      select: {
        ...taskSelect.public,
        owner: { select: userSelect.public },
        progressMeta: { include: { entries: true } },
        subtasks: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: number, dto: UpdateTaskDto) {
    // prevent setting invalid parent (self or descendant) - basic check

    return this.db.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description ?? undefined,
        type: dto.type ?? undefined,
        status: dto.status ?? undefined,
        priority: dto.priority ?? undefined,
        scheduledFor: dto.scheduledFor
          ? new Date(dto.scheduledFor)
          : dto.scheduledFor === null
            ? null
            : undefined,
        // parent: dto.parentId
        //   ? { connect: { id: dto.parentId } }
        //   : dto.parentId === null
        //     ? { disconnect: true }
        //     : undefined,
      },
    });
  }

  async remove(id: number) {
    // cascade considerations: subtasks, schedules, progress etc. Prisma will enforce FK constraints; handle or cascade manually if needed
    return this.db.task.delete({ where: { id } });
  }

  // Schedule management
  async addSchedule(
    taskId: number,
    dto: CreateScheduleDto,
  ): Promise<TaskSchedule> {
    await this.ensureTaskExists(taskId);
    return this.db.taskSchedule.create({
      data: {
        task: { connect: { id: taskId } },
        type: dto.type,
        runAt: dto.runAt ? new Date(dto.runAt) : null,
        timeOfDay: dto.timeOfDay ?? null,
        daysOfWeek: dto.daysOfWeek ?? undefined,
        dayOfMonth: dto.dayOfMonth ?? undefined,
        cronExpression: dto.cronExpression ?? null,
      },
    });
  }

  async updateSchedule(id: number, dto: UpdateScheduleDto) {
    return this.db.taskSchedule.update({
      where: { id },
      data: {
        runAt: dto.runAt ? new Date(dto.runAt) : undefined,
        timeOfDay: dto.timeOfDay ?? undefined,
        daysOfWeek: dto.daysOfWeek ?? undefined,
        dayOfMonth: dto.dayOfMonth ?? undefined,
        cronExpression: dto.cronExpression ?? undefined,
      },
    });
  }

  async removeSchedule(id: number) {
    return this.db.taskSchedule.delete({ where: { id } });
  }

  async updateInstance(id: number, dto: UpdateTaskInstanceDto) {
    const data: Prisma.TaskInstanceUpdateInput = {};

    if (dto.status) {
      data.status = dto.status;

      if (dto.status === 'done') {
        data.completedAt = new Date();
      }
    }

    if (dto.dueAt) {
      data.dueAt = new Date(dto.dueAt);
    }

    return this.db.taskInstance.update({
      where: { id },
      data,
    });
  }

  // Subtasks
  async createSubtask(taskId: number, ownerId: number, dto: CreateTaskDto) {
    await this.ensureTaskExists(taskId);
    return this.db.task.create({
      data: {
        ...dto,
        parent: { connect: { id: taskId } },
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        owner: { connect: { id: ownerId } },
      },
    });
  }

  // Task links (many-to-many self relation)
  async linkTasks(taskId: number, otherId: number) {
    if (taskId === otherId)
      throw new BadRequestException('Cannot link task to itself');
    await this.ensureTaskExists(taskId);
    await this.ensureTaskExists(otherId);

    // connect relationship both ways is handled by Prisma many-to-many
    await this.db.task.update({
      where: { id: taskId },
      data: { linkedTasks: { connect: { id: otherId } } },
    });
    return this.db.task.findUnique({
      where: { id: taskId },
      include: { linkedTasks: true },
    });
  }

  async unlinkTasks(taskId: number, otherId: number) {
    await this.ensureTaskExists(taskId);
    await this.ensureTaskExists(otherId);
    await this.db.task.update({
      where: { id: taskId },
      data: { linkedTasks: { disconnect: { id: otherId } } },
    });
    return this.db.task.findUnique({
      where: { id: taskId },
      include: { linkedTasks: true },
    });
  }

  // Progress meta for progressive tasks
  async setProgressMeta(
    taskId: number,
    dto: CreateTaskProgressDto,
  ): Promise<TaskProgress> {
    await this.ensureTaskExists(taskId);

    return this.db.taskProgress.upsert({
      where: { taskId },
      update: {
        targetValue: dto.targetValue,
        unit: dto.unit,
        aggregation: dto.aggregation,
        isCumulative: dto.isCumulative,
      },
      create: {
        task: { connect: { id: taskId } },
        targetValue: dto.targetValue,
        unit: dto.unit,
        aggregation: dto.aggregation,
        isCumulative: dto.isCumulative ?? true,
      },
    });
  }

  async addProgressEntry(
    taskId: number,
    dto: CreateProgressEntryDto,
  ): Promise<ProgressEntry> {
    await this.ensureTaskExists(taskId);
    // make sure task has TaskProgress if taskProgressId provided or task is progressive
    const entry = await this.db.progressEntry.create({
      data: {
        task: { connect: { id: taskId } },
        amount: dto.amount,
        actor: dto.actorId ? { connect: { id: dto.actorId } } : undefined,
        groupDate: dto.groupDate ? new Date(dto.groupDate) : undefined,
        note: dto.note,
        taskProgress: dto.taskProgressId
          ? { connect: { id: dto.taskProgressId } }
          : undefined,
      },
    });

    return entry;
  }

  async getProgressEntries(taskId: number) {
    await this.ensureTaskExists(taskId);
    return this.db.progressEntry.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async changeStatus(id: number, status: TaskStatus) {
    return this.db.task.update({ where: { id }, data: { status } });
  }

  async bulkUpdateStatus(ids: number[], status: TaskStatus) {
    return this.db.task.updateMany({
      where: { id: { in: ids } },
      data: { status: status },
    });
  }

  private async ensureTaskExists(id: number) {
    const t = await this.db.task.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Task not found');
  }

  // stats
  async getStats(userId: number): Promise<TaskStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Всего задач текущего пользователя
    const total = await this.db.task.count({
      where: { ownerId: userId },
    });

    // Задачи на сегодня
    const todayTasks = await this.db.task.count({
      where: {
        ownerId: userId,
        status: { not: 'done' },
        scheduledFor: { gte: today, lt: tomorrow },
      },
    });

    // Прогрессивные задачи aggregation=DAILY
    const progressiveToday = await this.db.task.count({
      where: {
        ownerId: userId,
        type: 'PROGRESSIVE',
        progressMeta: { aggregation: 'DAILY' },
        status: { not: 'done' },
      },
    });

    // Статистика по статусам
    const byStatusRaw = await this.db.task.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { ownerId: userId },
    });

    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach((item) => (byStatus[item.status] = item._count.status));

    return { total, today: todayTasks, progressiveToday, byStatus };
  }

  async generateInstances(windowDays = 7) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowDays * 24 * 3600 * 1000);

    const schedules = await this.db.taskSchedule.findMany({
      include: { task: true },
    });

    for (const schedule of schedules) {
      // ✅ все существующие инстансы в Set
      const existing = await this.db.taskInstance.findMany({
        where: { scheduleId: schedule.id, occurrenceAt: { lte: windowEnd } },
        select: { occurrenceAt: true },
      });
      const existingSet = new Set(
        existing.map((e) => e.occurrenceAt.getTime()),
      );

      // start cursor: если есть последний instance, берем после него
      let cursor = existing.length
        ? new Date(Math.max(...existing.map((e) => e.occurrenceAt.getTime())))
        : now;

      const toCreate: Prisma.TaskInstanceCreateManyInput[] = [];

      const MAX_ITER = 100; // safety cap
      for (let i = 0; i < MAX_ITER; i++) {
        const next = computeNextOccurrence(
          schedule,
          new Date(cursor.getTime() + 1),
        );
        if (!next) break;
        if (next > windowEnd) break;

        const t = next.getTime();
        if (!existingSet.has(t)) {
          toCreate.push({
            taskId: schedule.taskId,
            scheduleId: schedule.id,
            occurrenceAt: next,
            dueAt: next,
            status: 'pending',
            createdAt: new Date(),
          });
          existingSet.add(t);
        }

        cursor = next; // cursor двигается вперед
      }

      if (toCreate.length > 0) {
        await this.db.taskInstance.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  /**
   * Mark pending instances older than (now - graceMinutes) as missed.
   * Returns { marked: number }.
   */
  async markMissedInstances(opts?: { graceMinutes?: number }) {
    const graceMinutes = opts?.graceMinutes ?? 0;
    const cutoff = new Date(Date.now() - graceMinutes * 60_000);

    // 1) Find pending instances to mark (limit batch size to avoid huge memory spikes)
    const batchSize = 1000;
    const toMark = await this.db.taskInstance.findMany({
      where: {
        status: 'pending',
        occurrenceAt: { lt: cutoff },
      },
      take: batchSize,
      include: { task: { select: { ownerId: true, title: true } } }, // include owner to create notifications/activities
      orderBy: { occurrenceAt: 'asc' },
    });

    if (!toMark.length) {
      return { marked: 0 };
    }

    const ids = toMark.map((i) => i.id);

    // 2) atomically mark them as missed (only pending -> missed)
    //    We use updateMany where id in ids and status == pending to avoid race.
    const updateRes = await this.db.taskInstance.updateMany({
      where: {
        id: { in: ids },
        status: 'pending',
      },
      data: {
        status: 'missed',
      },
    });

    const markedCount = updateRes.count;

    // 3) Create activity feed entries / notifications / points in same transaction if important
    //    We create activity items for each marked instance (optional)
    const feedItems = toMark
      .filter((inst) => inst.task.ownerId != null)
      .map((inst) => ({
        userId: inst.task.ownerId!,
        type: 'task_missed',
        body: {
          taskId: inst.taskId,
          instanceId: inst.id,
          title: inst.task.title,
          occurrenceAt: inst.occurrenceAt,
        },
        isPublic: false,
        createdAt: new Date(),
      }));

    // Use createMany for efficiency
    if (feedItems.length) {
      try {
        await this.db.activityFeedItem.createMany({
          data: feedItems,
        });
      } catch (err) {
        // this.logger.warn('Could not create activity feed items', err);
      }
    }

    // 4) Optionally: send notifications (Telegram, email) for missed items
    //    Best: push job into notification queue instead of synchronous sending.

    return { marked: markedCount };
  }

  // Mark single instance as missed manually (idempotent)
  async markInstanceMissed(instanceId: number) {
    const inst = await this.db.taskInstance.findUnique({
      where: { id: instanceId },
      include: { task: true },
    });
    if (!inst) throw new Error('Not found');

    // update only if still pending
    const updated = await this.db.taskInstance.updateMany({
      where: { id: instanceId, status: 'pending' },
      data: { status: 'missed' },
    });

    if (updated.count > 0) {
      await this.db.activityFeedItem.create({
        data: {
          userId: inst.task.ownerId!,
          type: 'task_missed_manual',
          body: {
            taskId: inst.taskId,
            instanceId: inst.id,
            occurrenceAt: inst.occurrenceAt,
          },
          isPublic: false,
        },
      });
    }

    return { marked: updated.count === 1 };
  }
}
