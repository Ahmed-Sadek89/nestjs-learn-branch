import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientService } from 'src/client/client.service';
import * as bcrypt from "bcrypt";
import { LoginDto } from './dto/login.dto';
import refreshJwtConfig from './config/refresh-jwt.config';


@Injectable()
export class AuthService {
    constructor(
        private readonly clientService: ClientService,
        private readonly jwtService: JwtService,
        @Inject(refreshJwtConfig.KEY) private readonly refreshJwt: ConfigType<typeof refreshJwtConfig>,
    ) { }

    async login(dto: LoginDto) {
        const user = await this.clientService.findByEmail(dto.email);
        if (!user?.data) {
            throw new UnauthorizedException("User not found");
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.data.password || "");
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid password");
        }

        const payload = { sub: user.data.id, email: user.data.email };
        return {
            user: { id: user.data.id, email: user.data.email },
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign({ ...payload, typ: 'refresh' }, this.refreshJwt),
        };
    }

    refreshAccess(user: { userId: number; email: string }) {
        return {
            access_token: this.jwtService.sign({ sub: user.userId, email: user.email }),
        };
    }
}
