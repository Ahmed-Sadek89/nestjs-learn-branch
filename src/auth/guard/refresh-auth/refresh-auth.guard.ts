import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshAuthGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser>(err: unknown, user: TUser, info: Error | undefined): TUser {
    if (user) return user;
    if (err) throw err;

    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (info?.message === 'No auth token') {
      throw new UnauthorizedException('Missing refresh token');
    }
    throw new UnauthorizedException('Invalid refresh token');
  }
}
