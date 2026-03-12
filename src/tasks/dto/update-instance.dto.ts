import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { TaskInstanceStatus } from '@prisma/client';

export class UpdateTaskInstanceDto {
  @IsOptional()
  @IsEnum(TaskInstanceStatus)
  status?: TaskInstanceStatus;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
