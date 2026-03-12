export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export interface IPaginatedSource<T> {
  find(options: {
    skip: number;
    take: number;
    [key: string]: any;
  }): Promise<T[]>;
  count?(options?: { [key: string]: any }): Promise<number>; // count необязателен
}
