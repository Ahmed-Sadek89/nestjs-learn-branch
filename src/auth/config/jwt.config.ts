import { registerAs } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '30s',
    } as JwtModuleOptions['signOptions'],
  }),
);
