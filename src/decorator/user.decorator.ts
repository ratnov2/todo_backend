import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthUser } from 'src/guards/types';

export const CurrentUser = createParamDecorator(
  <K extends keyof AuthUser>(
    key: K | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[K] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      return undefined;
    }

    return key ? user[key] : user;
  },
);
