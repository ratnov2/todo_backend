import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  handleRequest(err, user) {
    if (err || !user) {
      throw new UnauthorizedException({
        message: err?.message ?? 'Unauthorized',
        authType: 'access',
      });
    }
    return user;
  }
}

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err, user) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          message: err?.message ?? 'Unauthorized',
          authType: 'refresh',
        })
      );
    }

    return user;
  }
}
