import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    if (!req.user) {
      throw new UnauthorizedException('User missing');
    }

    if (req.user.isBlocked) {
      throw new ForbiddenException('User blocked');
    }

    return true;
  }
}
