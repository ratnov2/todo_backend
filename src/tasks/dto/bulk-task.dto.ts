import { IsArray, IsEnum, IsInt, ArrayNotEmpty } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];

  @IsEnum(TaskStatus)
  status: TaskStatus;
}
