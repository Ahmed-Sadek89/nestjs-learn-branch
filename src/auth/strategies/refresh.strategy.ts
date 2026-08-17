import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import refreshJwtConfig from '../config/refresh-jwt.config';

type JwtPayload = { sub: number; email: string; typ?: 'access' | 'refresh' };

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(refreshJwtConfig.KEY)
    refreshJwt: ConfigType<typeof refreshJwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
      ignoreExpiration: false,
      secretOrKey: refreshJwt.secret as string,
    });
  }

  validate(payload: JwtPayload) {
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token required');
    }
    return { userId: payload.sub, email: payload.email };
  }
}
