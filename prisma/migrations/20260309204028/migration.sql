-- CreateEnum
CREATE TYPE "TaskInstanceStatus" AS ENUM ('pending', 'inProgress', 'done', 'failed', 'missed', 'cancelled');

-- CreateTable
CREATE TABLE "TaskInstance" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "occurrenceAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "TaskInstanceStatus" NOT NULL DEFAULT 'pending',
    "createdById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskInstance_taskId_idx" ON "TaskInstance"("taskId");

-- CreateIndex
CREATE INDEX "TaskInstance_scheduleId_idx" ON "TaskInstance"("scheduleId");

-- CreateIndex
CREATE INDEX "TaskInstance_occurrenceAt_idx" ON "TaskInstance"("occurrenceAt");

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TaskSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
