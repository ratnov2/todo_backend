import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsObject } from 'class-validator';

export class TaskStatsDto {
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 100, description: 'Total number of tasks' })
  total: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 10, description: 'Number of tasks for today' })
  today: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 5, description: 'Number of progressive tasks for today' })
  progressiveToday: number;

  @IsObject()
  @ApiProperty({ example: { pending: 10, inProgress: 5, done: 3, cancelled: 2 }, description: 'Statistics by task status' })
  byStatus: Record<string, number>;
}
