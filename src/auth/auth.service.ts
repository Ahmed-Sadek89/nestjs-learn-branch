import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientService } from 'src/client/client.service';
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
    constructor(
        private readonly clientService: ClientService,
    ) { }

    async validateUser(email: string, password: string) {
        const user = await this.clientService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException("User not found");
        }
        const isPasswordValid = await bcrypt.compare(password, user?.data?.password || "");
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid password");
        }
        return {
            user: user.data?.id
        };
    }
}
