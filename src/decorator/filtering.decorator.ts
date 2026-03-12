import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

export type Filtering = {
  property: string;
  rule: string;
  value: string;
};

// valid filter rules
export enum FilterRule {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUALS = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUALS = 'lte',
  LIKE = 'like',
  NOT_LIKE = 'nlike',
  IN = 'in',
  NOT_IN = 'nin',
  IS_NULL = 'isnull',
  IS_NOT_NULL = 'isnotnull',
}

export const FilteringParams = createParamDecorator(
  (data: string[], ctx: ExecutionContext): Filtering[] | null => {
    const req: Request = ctx.switchToHttp().getRequest();
    const filter = req.query.filter as string;
    if (!filter) return null;

    const rawFilters = filter.split(';'); // разделяем по ;

    return rawFilters.map((f) => {
      if (
        !f.match(
          /^[a-zA-Z0-9_]+:(eq|neq|gt|gte|lt|lte|like|nlike|in|nin):[a-zA-Z0-9_,]+$/,
        ) &&
        !f.match(/^[a-zA-Z0-9_]+:(isnull|isnotnull)$/)
      ) {
        throw new BadRequestException(`Invalid filter parameter: ${f}`);
      }

      const [property, rule, value] = f.split(':');
      if (!data.includes(property))
        throw new BadRequestException(`Invalid filter property: ${property}`);
      if (!Object.values(FilterRule).includes(rule as FilterRule))
        throw new BadRequestException(`Invalid filter rule: ${rule}`);

      return { property, rule: rule as FilterRule, value };
    });
  },
);

export const getWhere = (filter: Filtering) => {
  if (!filter) return {};

  const { property, rule, value } = filter;

  switch (rule) {
    case FilterRule.IS_NULL:
      return { [property]: null };

    case FilterRule.IS_NOT_NULL:
      return { [property]: { not: null } };

    case FilterRule.EQUALS:
      return { [property]: value };

    case FilterRule.NOT_EQUALS:
      return { [property]: { not: value } };

    case FilterRule.GREATER_THAN:
      return { [property]: { gt: Number(value) } };

    case FilterRule.GREATER_THAN_OR_EQUALS:
      return { [property]: { gte: Number(value) } };

    case FilterRule.LESS_THAN:
      return { [property]: { lt: Number(value) } };

    case FilterRule.LESS_THAN_OR_EQUALS:
      return { [property]: { lte: Number(value) } };

    case FilterRule.LIKE:
      return { [property]: { contains: value, mode: 'insensitive' } };

    case FilterRule.NOT_LIKE:
      return { [property]: { not: { contains: value, mode: 'insensitive' } } };

    case FilterRule.IN:
      return { [property]: { in: value.split(',') } };

    case FilterRule.NOT_IN:
      return { [property]: { notIn: value.split(',') } };

    default:
      return {};
  }
};
