// src/common/pagination/pagination.service.ts
import { Injectable } from '@nestjs/common';
import { IPaginatedSource, PaginationParams } from './types';

@Injectable()
export class PaginationService {
  async paginate<T>(
    source: IPaginatedSource<T>,
    options: any,
    pagination: PaginationParams,
  ): Promise<{ data: T[]; total: number }> {
    const [data, total] = await Promise.all([
      source.find({ ...options, skip: pagination.skip, take: pagination.take }),
      source.count ? source.count(options) : Promise.resolve(0),
    ]);

    return { data, total };
  }
}
