# NestJS: Environment Variables (`.env`)

A beginner guide to **`.env` files**: what they are, how to use them safely in NestJS, and how they connect to PostgreSQL / TypeORM / JWT.

Use this with:

- [PostgreSQL on WSL](./postgres-wsl-guide.md)
- [TypeORM guide](./learn-typeorm.md)
- [Beginner NestJS guide](./nestjs-beginner-guide.md)

---

## 1. What is `.env`?

A **`.env`** file stores **configuration as key=value pairs** outside your code.

```env
PORT=3000
DB_HOST=localhost
DB_PASSWORD=secret
```

Your app reads them as `process.env.PORT`, `process.env.DB_HOST`, etc.

### Why not hardcode?

| Hardcoded in code | In `.env` |
|-------------------|-----------|
| Password ends up in git | Secrets stay local / on the server |
| Same values for every machine | Each developer / env can differ |
| Changing port needs a code edit | Change file or hosting settings |
| Easy to leak API keys | `.env` is gitignored |

**One sentence:** `.env` holds settings and secrets that change per machine or environment — not business logic.

---

## 2. Mental model

```
.env file
    │  loaded at startup
    ▼
process.env  (Node environment)
    │
    ▼
Nest ConfigModule / ConfigService
    │
    ▼
AppModule, TypeORM, JWT, services, …
```

Flow:

1. You create `.env` in the **project root** (next to `package.json`).
2. Nest (or `dotenv`) loads it when the app starts.
3. Code reads values via `ConfigService` or `process.env`.

---

## 3. File types you will see

| File | Commit to git? | Purpose |
|------|----------------|---------|
| **`.env`** | **No** | Real local secrets and settings |
| **`.env.example`** | **Yes** | Template with empty/placeholder values — documents required keys |
| **`.env.development`** | Usually no | Optional: values for `NODE_ENV=development` |
| **`.env.production`** | **No** (use host secrets) | Optional: production-oriented local overrides |
| **`.env.test`** | Usually no | Values for Jest / e2e |

**Rule:** never commit real passwords, JWT secrets, or API keys. Commit only `.env.example`.

---

## 4. Syntax rules

```env
# Comments start with #

# No spaces around = (best practice)
PORT=3000
DB_HOST=localhost

# Quotes are optional; use them if the value has spaces
APP_NAME="Lear Nest API"

# Do NOT put a trailing space after the value
# Bad:  PORT=3000 
# Good: PORT=3000

# Booleans and numbers are still strings until you convert them
DB_PORT=5432
TYPEORM_SYNC=true

# Prefer single-line values in Nest apps
DATABASE_URL=postgresql://user:pass@localhost:5432/lear_nest
```

Common mistakes:

- `export PORT=3000` — not needed in `.env` files for Nest
- `PORT = 3000` — spaces around `=` can break some loaders
- Putting secrets in `.env.example`
- Naming the file `env` without the leading dot

---

## 5. Protect secrets (`.gitignore`)

Your Nest starter already ignores common env files. Keep at least:

```gitignore
# dotenv environment variable files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

Optional extras while learning:

```gitignore
.env.development
.env.production
.env.test
```

Check before every commit:

```bash
git status
# .env must NOT appear as a tracked file
```

If you ever committed a secret by mistake: rotate the password/key immediately (treat it as leaked).

---

## 6. Install Nest Config

Plain Node does not load `.env` automatically. Nest’s official way:

```bash
npm install @nestjs/config
```

### Wire it in `AppModule` (first import)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,          // ConfigService available everywhere
      envFilePath: '.env',     // project root
      // expandVariables: true, // optional: DB_URL=${DB_HOST}:5432
    }),
    // TypeORM, feature modules…
  ],
})
export class AppModule {}
```

`isGlobal: true` means you do **not** re-import `ConfigModule` in every feature module.

### Multiple files (optional)

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    `.env.${process.env.NODE_ENV ?? 'development'}`,
    '.env', // fallback
  ],
}),
```

Keep one clear source of truth while learning (usually just `.env`).

---

## 7. Reading values in code

### Prefer `ConfigService` (Nest way)

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppInfoService {
  constructor(private readonly config: ConfigService) {}

  getPort(): number {
    return this.config.get<number>('PORT', 3000);
  }

  getDbHost(): string {
    // throws a clear error if missing
    return this.config.getOrThrow<string>('DB_HOST');
  }
}
```

| Method | Behavior |
|--------|----------|
| `config.get('KEY')` | `undefined` if missing |
| `config.get('KEY', defaultValue)` | Uses default if missing |
| `config.getOrThrow('KEY')` | Throws if missing (good for required secrets) |

### Still works: `process.env`

```typescript
await app.listen(process.env.PORT ?? 3000);
```

Fine for tiny apps. Prefer `ConfigService` once you have many modules — easier to test and type.

### Types: everything is a string

```env
DB_PORT=5432
TYPEORM_SYNC=true
```

```typescript
const port = Number(this.config.get('DB_PORT', 5432));
const sync = this.config.get('TYPEORM_SYNC') === 'true';
```

Or use a **validated config schema** (section 10).

---

## 8. Example project files

### `.env` (local — do not commit)

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=nestuser
DB_PASSWORD=strongpassword
DB_NAME=lear_nest

# TypeORM (learning)
TYPEORM_SYNC=true
TYPEORM_LOGGING=true

# Auth (example)
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
```

### `.env.example` (commit this)

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=lear_nest

TYPEORM_SYNC=true
TYPEORM_LOGGING=true

JWT_SECRET=
JWT_EXPIRES_IN=1d
```

Teammates copy it:

```bash
cp .env.example .env
# then fill in real values
```

### Same DB as a single URL (optional)

```env
DATABASE_URL=postgresql://nestuser:strongpassword@localhost:5432/lear_nest
```

Useful for Prisma-style apps or some hosts. With TypeORM you can still use separate `DB_*` keys (clearer for beginners).

---

## 9. Use `.env` with TypeORM

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('TYPEORM_SYNC') === 'true',
        logging: config.get('TYPEORM_LOGGING') === 'true',
      }),
    }),
  ],
})
export class AppModule {}
```

Why `forRootAsync`? TypeORM needs config **after** `ConfigModule` has loaded `.env`. Sync `forRoot({ host: process.env… })` can work if the env file is already loaded, but `forRootAsync` is the Nest-recommended pattern.

In production:

```env
TYPEORM_SYNC=false
```

Use migrations instead of `synchronize` (see [learn-typeorm.md](./learn-typeorm.md)).

---

## 10. Validate env at startup (recommended)

Catch missing/invalid env **before** the app half-starts.

```bash
npm install joi
```

### With Joi

```typescript
// app.module.ts
import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  validationSchema: Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(3000),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    TYPEORM_SYNC: Joi.boolean().truthy('true').falsy('false').default(false),
    JWT_SECRET: Joi.string().min(16).required(),
    JWT_EXPIRES_IN: Joi.string().default('1d'),
  }),
}),
```

If `DB_PASSWORD` is missing, Nest fails fast with a clear validation error.

---

## 11. Environments: development vs production

| Concern | Development | Production |
|---------|-------------|------------|
| Where secrets live | Local `.env` | Host dashboard / secrets manager (Railway, Fly, AWS, Docker env, …) |
| `TYPEORM_SYNC` | Often `true` while learning | **`false`** |
| `NODE_ENV` | `development` | `production` |
| Logging | Verbose OK | Less sensitive detail |
| JWT secret | Long random local string | Strong secret from vault / host |

On many hosts you **paste env vars in the UI** — no `.env` file is deployed. Same keys, different storage.

Local Docker example:

```yaml
# docker-compose.yml (illustration)
services:
  api:
    env_file:
      - .env
    # or:
    environment:
      PORT: 3000
      DB_HOST: postgres
```

---

## 12. Naming conventions

Good habits:

```text
UPPER_SNAKE_CASE
Group by prefix: DB_*, JWT_*, REDIS_*, SMTP_*
```

Examples:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=
JWT_EXPIRES_IN=

REDIS_URL=
SMTP_HOST=
```

Avoid:

- Vague names: `SECRET`, `KEY`, `PASS`
- Mixing styles: `dbHost`, `Db_Host`, `DB-HOST`
- Putting the same secret under two different names without documenting which wins

---

## 13. Security checklist

1. **Never** commit `.env` with real secrets.
2. **Never** log `DB_PASSWORD`, `JWT_SECRET`, tokens, or full connection strings.
3. Use **different** passwords for local, staging, and production.
4. Rotate secrets if they were shared in chat, screenshots, or git history.
5. Prefer `getOrThrow` / Joi for required production keys.
6. Do not put secrets in frontend `NEXT_PUBLIC_*` / `VITE_*` vars — those are exposed to browsers. This Nest API keeps secrets **server-side only**.
7. Restrict who can read production env on the hosting platform.

---

## 14. Using env in `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
```

`ConfigModule` must be imported in `AppModule` first so `ConfigService` is available here.

---

## 15. Inject config in a feature service

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConfigService {
  constructor(private readonly config: ConfigService) {}

  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.config.get<string>('JWT_EXPIRES_IN', '1d');
  }
}
```

No need to import `ConfigModule` again if you set `isGlobal: true`.

---

## 16. Testing with env

In unit tests, override config:

```typescript
{
  provide: ConfigService,
  useValue: {
    get: (key: string, def?: unknown) => {
      const map: Record<string, string> = {
        JWT_SECRET: 'test-secret-at-least-16',
        DB_HOST: 'localhost',
      };
      return map[key] ?? def;
    },
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        JWT_SECRET: 'test-secret-at-least-16',
        DB_HOST: 'localhost',
      };
      const value = map[key];
      if (value === undefined) throw new Error(`Missing ${key}`);
      return value;
    },
  },
}
```

Or use a dedicated `.env.test` and point e2e at it:

```typescript
ConfigModule.forRoot({
  envFilePath: '.env.test',
}),
```

---

## 17. Quick troubleshooting

| Problem | Likely cause |
|---------|----------------|
| `undefined` for every key | `.env` not in project root, or `ConfigModule` not imported |
| Works in terminal, not in Nest | You `export`ed vars in shell but Nest isn’t loading `.env` |
| Wrong DB / wrong port | Typo in key name; old process still running — restart `start:dev` |
| `synchronize` on in prod | `TYPEORM_SYNC=true` left over — set `false` |
| Validation error on boot | Joi schema failed — read which key is missing/invalid |
| Secret appeared on GitHub | Rotate it; add `.env` to `.gitignore`; scrub history if needed |

Restart the Nest process after editing `.env` — values are read at startup, not live-reloaded by default.

---

## 18. Minimal setup checklist

1. `npm install @nestjs/config`
2. Create `.env` and `.env.example` in the project root
3. Ensure `.env` is in `.gitignore` (already true in this starter)
4. `ConfigModule.forRoot({ isGlobal: true })` as the **first** import in `AppModule`
5. Switch TypeORM to `forRootAsync` + `ConfigService`
6. Use `getOrThrow` (or Joi) for passwords and JWT secrets
7. Never log secret values

When that works, connect the same `DB_*` keys to the Postgres user you created in [postgres-wsl-guide.md](./postgres-wsl-guide.md) and the entities in [learn-typeorm.md](./learn-typeorm.md).
