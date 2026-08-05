# NestJS + JWT Auth with TypeORM

A practical guide to **JWT authentication** in NestJS: how JWT works, how to wire it into a Nest project, how to store users with **TypeORM**, model a **OneToMany** relation, and mark routes as **public** or **private** (JWT required).

Use this with:

- [TypeORM entities & relations](./learn-typeorm.md)
- [Model, Service & Controller](./learn-model-service-controller.md)
- [Beginner NestJS guide](./nestjs-beginner-guide.md)
- Official Nest docs: [Authentication](https://docs.nestjs.com/security/authentication) · [Passport JWT recipe](https://docs.nestjs.com/recipes/passport)

---

## 1. What is JWT?

**JWT** (JSON Web Token) is a signed string the server gives a client after a successful login. The client sends it on later requests so the server can trust **who** the caller is **without storing a session** on the server.

```
Register / Login
      │
      ▼
Server checks email + password (DB)
      │
      ▼
Server signs a JWT  →  { access_token: "eyJhbGciOi..." }
      │
      ▼
Client stores token (memory / secure storage)
      │
      ▼
Client calls private APIs with:
Authorization: Bearer eyJhbGciOi...
      │
      ▼
Guard verifies signature + expiry → attaches user to request
```

A JWT has three Base64url parts:

```
header.payload.signature
```

| Part | Meaning |
|------|---------|
| **Header** | Algorithm (e.g. `HS256`) |
| **Payload** | Claims (`sub` = user id, `email`, `iat`, `exp`) |
| **Signature** | Proves the token was signed with your secret |

**Important:**

- The payload is **readable** (not encrypted). Never put passwords in it.
- Security comes from the **signature** + a strong **secret** in env vars.
- Tokens **expire** (`expiresIn`). Short-lived access tokens are safer.

**One sentence:** login proves identity once; JWT proves identity on every later request.

---

## 2. Public vs private endpoints

| Kind | Meaning | Example |
|------|---------|---------|
| **Public** | No token needed | `POST /auth/register`, `POST /auth/login`, `GET /health` |
| **Private** | Valid JWT required | `GET /auth/me`, `POST /posts`, `DELETE /posts/:id` |

Recommended Nest pattern (used in this guide):

1. Register a **global** JWT guard → **all** routes are private by default.
2. Mark exceptions with `@Public()`.

That way you never forget to protect a new endpoint.

---

## 3. Install packages

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @nestjs/typeorm typeorm pg bcrypt
pnpm add class-validator class-transformer
pnpm add -D @types/passport-jwt @types/bcrypt
```

| Package | Role |
|---------|------|
| `@nestjs/jwt` | Sign / verify JWTs |
| `@nestjs/passport` + `passport-jwt` | Strategy that reads `Authorization: Bearer` |
| `bcrypt` | Hash passwords (never store plain text) |
| `typeorm` + `pg` | Persist users / posts in PostgreSQL |

Add to `.env` (never commit secrets):

```env
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
DB_HOST=localhost
DB_PORT=5432
DB_USER=typeorm_user
DB_PASSWORD=1234
DB_NAME=typeorm_database
```

---

## 4. Domain model (TypeORM + OneToMany)

Example: one **User** has many **Posts**.

```
users 1 ──────< posts
```

### `user.entity.ts`

```typescript
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Post } from '../posts/post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  email!: string;

  /** Hashed password — never return this in API responses */
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => Post, (post) => post.author, {
    cascade: ['insert'],
  })
  posts!: Post[];
}
```

### `post.entity.ts`

```typescript
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text', default: '' })
  body!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /** Owning side of the relation — FK lives here */
  @ManyToOne(() => User, (user) => user.posts, {
    nullable: false,
    onDelete: 'CASCADE', // delete posts when user is deleted
  })
  @JoinColumn({ name: 'author_id' })
  author!: User;
}
```

**Notes:**

- `cascade: true` on relations ≠ DB `ON DELETE CASCADE`. Use `onDelete: 'CASCADE'` on the `@ManyToOne` for delete-related rows in Postgres.
- Never expose `passwordHash` in controllers — map to a safe response DTO.

---

## 5. Auth building blocks

Folder sketch:

```
src/
  auth/
    auth.module.ts
    auth.service.ts
    auth.controller.ts
    dto/
      register.dto.ts
      login.dto.ts
    decorators/
      public.decorator.ts
      current-user.decorator.ts
    guards/
      jwt-auth.guard.ts
    strategies/
      jwt.strategy.ts
  users/
    user.entity.ts
    users.module.ts
    users.service.ts
  posts/
    post.entity.ts
    posts.module.ts
    posts.controller.ts
    posts.service.ts
```

### 5.1 DTOs

```typescript
// auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

```typescript
// auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

### 5.2 `@Public()` decorator

```typescript
// auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 5.3 Current user decorator (private routes)

```typescript
// auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = { userId: number; email: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 5.4 JWT strategy (Passport)

Reads `Authorization: Bearer <token>`, verifies it, returns the payload Nest attaches as `req.user`.

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = { sub: number; email: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // Becomes request.user
    return { userId: payload.sub, email: payload.email };
  }
}
```

> If you are not using `@nestjs/config` yet, pass `process.env.JWT_SECRET!` instead — but ConfigModule is preferred.

### 5.5 JWT guard that respects `@Public()`

```typescript
// auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### 5.6 Auth service (register / login + TypeORM)

```typescript
// auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
    await this.usersRepo.save(user);

    return this.tokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.tokenResponse(user);
  }

  async me(userId: number) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { posts: true }, // OneToMany load
    });
    if (!user) throw new UnauthorizedException();

    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  private tokenResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
```

### 5.7 Auth controller (public + private)

```typescript
// auth/auth.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Private — global JwtAuthGuard requires Bearer token */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }
}
```

### 5.8 Auth module

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') ?? '1d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

## 6. Wire everything in `AppModule`

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { Post } from './posts/post.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Post],
      synchronize: true, // OK for learning; use migrations in production
    }),
    AuthModule,
    UsersModule,
    PostsModule,
  ],
  providers: [
    // 🔒 Every route needs JWT unless marked @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

Enable validation in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

Also install config if needed:

```bash
pnpm add @nestjs/config
```

---

## 7. Private posts API using the logged-in user (OneToMany)

```typescript
// posts/posts.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /** Public feed — anyone can read */
  @Public()
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  /** Private — create as the authenticated user */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.userId, dto);
  }

  /** Private — only my posts */
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.postsService.findByAuthor(user.userId);
  }
}
```

```typescript
// posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from './post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findAll() {
    return this.postsRepo.find({
      relations: { author: true },
      order: { createdAt: 'DESC' },
    });
  }

  findByAuthor(authorId: number) {
    return this.postsRepo.find({
      where: { author: { id: authorId } },
      order: { createdAt: 'DESC' },
    });
  }

  async create(authorId: number, dto: CreatePostDto) {
    const author = await this.usersRepo.findOneByOrFail({ id: authorId });
    const post = this.postsRepo.create({
      title: dto.title,
      body: dto.body ?? '',
      author,
    });
    return this.postsRepo.save(post);
  }
}
```

Because of `@OneToMany` / `@ManyToOne`, creating a post always ties it to the JWT user — clients cannot spoof another `author_id` if you take the id from the token, not from the body.

---

## 8. Endpoint map (cheat sheet)

| Method | Path | Access | Header |
|--------|------|--------|--------|
| `POST` | `/auth/register` | Public (`@Public`) | — |
| `POST` | `/auth/login` | Public | — |
| `GET` | `/auth/me` | Private | `Authorization: Bearer <token>` |
| `GET` | `/posts` | Public | — |
| `POST` | `/posts` | Private | Bearer token |
| `GET` | `/posts/mine` | Private | Bearer token |

### Try it (curl)

```bash
# Register (public)
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@test.com","name":"Ada","password":"secret123"}'

# Login (public)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@test.com","password":"secret123"}' | jq -r .access_token)

# Me (private)
curl -s http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"

# Create post (private)
curl -s -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","body":"JWT + TypeORM"}'

# List posts (public)
curl -s http://localhost:3000/posts
```

Without a token on a private route → Nest returns **401 Unauthorized**.

---

## 9. Alternative: guard only on chosen routes

If you prefer **public by default**:

```typescript
// Do NOT register APP_GUARD globally.
// Protect selected controllers/handlers instead:

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  @Post()
  create(...) { ... }
}
```

Global guard + `@Public()` is usually safer for APIs that are mostly authenticated.

---

## 10. Security checklist

| Rule | Why |
|------|-----|
| Store **bcrypt** hashes (cost ≥ 10) | Plain passwords in DB = disaster |
| `JWT_SECRET` from **env** | Hardcoded secrets leak in git |
| Short `expiresIn` | Limits damage if a token is stolen |
| Take `userId` from **token**, not body | Prevents acting as another user |
| Strip `passwordHash` from responses | Avoid leaking hashes |
| Use HTTPS in production | Stops token theft on the wire |
| Prefer **migrations** over `synchronize: true` in prod | Safer schema changes |

Optional next steps (not required for learning):

- Refresh tokens (rotate, store hash in DB/Redis)
- Roles / permissions (`@Roles('admin')` + RolesGuard)
- Rate-limit login (`@nestjs/throttler`)

---

## 11. Mental model (summary)

```
@Public() route  →  JwtAuthGuard skips verify  →  handler runs
Private route    →  JwtAuthGuard verifies JWT  →  req.user set  →  handler runs
                                                            │
                                                            ▼
                                              Service uses userId + TypeORM
                                              (User 1 — * Post)
```

| Concept | Nest piece |
|---------|------------|
| Sign token | `JwtService.sign` |
| Verify token | `JwtStrategy` + `JwtAuthGuard` |
| Skip auth | `@Public()` |
| Read caller | `@CurrentUser()` |
| Persist user/posts | TypeORM entities + repositories |
| User → posts | `@OneToMany` / `@ManyToOne` + `onDelete: 'CASCADE'` |

**One sentence:** JWT proves identity; TypeORM stores users and related rows; guards decide which endpoints require that proof.
