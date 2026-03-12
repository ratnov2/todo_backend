import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationParams } from './types';

export const Pagination = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PaginationParams => {
    const req = ctx.switchToHttp().getRequest();
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);

    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  },
);
