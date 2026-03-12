import { IPaginatedSource, PaginationParams } from './types';

export async function paginate<T>(
  source: IPaginatedSource<T>,
  options: any, // фильтры, сортировки
  pagination: PaginationParams,
): Promise<{ data: T[]; total: number }> {
  const [data, total] = await Promise.all([
    source.find({ ...options, skip: pagination.skip, take: pagination.take }),
    source.count ? source.count(options) : Promise.resolve(0),
  ]);

  return { data, total };
}
