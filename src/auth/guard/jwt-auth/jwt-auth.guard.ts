import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser, info: Error | undefined): TUser {
    if (user) return user;
    if (err) throw err;

    const name = info?.name;
    if (name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token expired');
    }
    if (info?.message === 'No auth token') {
      throw new UnauthorizedException('Missing Bearer token');
    }
    throw new UnauthorizedException('Invalid token');
  }
}
