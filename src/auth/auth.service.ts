import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientService } from 'src/client/client.service';
import * as bcrypt from "bcrypt";
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly clientService: ClientService,
        private readonly jwtService: JwtService,
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
            access_token: this.jwtService.sign(payload),
            user: { id: user.data.id, email: user.data.email },
        };
    }
}
