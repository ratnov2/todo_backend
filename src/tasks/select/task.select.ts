import { Prisma } from '@prisma/client';

export const taskSelect = {
  public: {
    id: true,
    createdAt: true,
    description: true,
    parentId: true,
    progressEntries: true,
    subtasks: true,
    owner: true,
    status: true,
    title: true,
    type: true,
    priority: true,
    schedules: true,
    progressMeta: true,
    scheduledFor: true
  } satisfies Prisma.TaskSelect,
};
