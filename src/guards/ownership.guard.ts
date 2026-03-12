import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  mixin,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';

export const OwnershipGuard = (options: { param?: string; body?: string }) =>
  mixin(
    class OwnershipGuardMixin implements CanActivate {
      canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest();
        const user = req.user as User;

        if (user.role === Role.ADMIN) return true;

        const targetId = options.param
          ? Number(req.params[options.param])
          : options.body
            ? Number(req.body[options.body])
            : undefined;

        if (!targetId || user.id !== targetId) {
          throw new ForbiddenException();
        }

        return true;
      }
    },
  );
