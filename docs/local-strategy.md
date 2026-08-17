# NestJS Local Strategy (email + password)

A short note on **Passport Local** in this project: which packages were installed, what each one does, and what happens on `POST /auth/login`.

This is the **login step only** (prove email + password). It does **not** issue a JWT yet. See [learn-jwt.md](./learn-jwt.md) for tokens after login.

---

## 1. Packages installed

```bash
pnpm add @nestjs/passport passport passport-local bcrypt
pnpm add -D @types/passport-local @types/bcrypt
```

Already in the project from earlier work: `@nestjs/jwt`, `passport-jwt` (not used by this local login flow yet).

| Package | Where | Role |
|---------|--------|------|
| **`passport`** | runtime | Auth engine. Strategies **register** themselves on it (name: `"local"`). |
| **`passport-local`** | runtime | Strategy that reads **username + password** from the request body (default fields: `username`, `password`). |
| **`@nestjs/passport`** | runtime | Nest wrapper: `PassportStrategy`, `AuthGuard('local')`. |
| **`bcrypt`** | runtime | Compare the plain password from the body with the hash stored on `Client`. |
| **`@types/passport-local`** | dev | TypeScript types for `passport-local`. |
| **`@types/bcrypt`** | dev | TypeScript types for `bcrypt`. |

**One sentence:** `passport-local` extracts email/password; `AuthService` + `bcrypt` decide if they are valid; Nest puts the result on `req.user`.

---

## 2. Why "local"?

Passport supports many **strategies**. Each has a string name:

| Strategy package | Name | Typical use |
|------------------|------|-------------|
| `passport-local` | `"local"` | Email + password in the JSON body |
| `passport-jwt` | `"jwt"` | `Authorization: Bearer <token>` |

`AuthGuard('local')` means: "run the strategy registered as `"local"`".

If that class is **not** in `AuthModule` providers (and not `@Injectable()`), Passport throws:

```text
Unknown authentication strategy "local"
```

---

## 3. Files in this project

```
src/auth/
  auth.module.ts              # registers LocalStrategy as a provider
  auth.controller.ts          # POST /auth/login + LocalAuthGuard
  auth.service.ts             # validateUser (DB + bcrypt)
  strategies/
    local.strategy.ts         # PassportStrategy(Strategy) from passport-local
  guard/local-auth/
    local-auth.guard.ts       # thin wrapper: AuthGuard('local')
```

User table: `Client` (`users`) with a `password` column hashed by `@BeforeInsert` / `@BeforeUpdate`.

---

## 4. What happens on login

```
POST /auth/login
  { "email": "...", "password": "..." }
        │
        ▼
LocalAuthGuard  →  AuthGuard('local')
        │
        ▼
passport-local reads body
  usernameField: 'email'   (we renamed username → email)
  passwordField: 'password' (default)
        │
        ▼
LocalStrategy.validate(email, password)
        │
        ▼
AuthService.validateUser
  1. ClientService.findByEmail(email)
     (must SELECT password — column is select: false)
  2. bcrypt.compare(plain, hash)
        │
        ├── fail → 401 Unauthorized
        │
        ▼ success
return value becomes req.user
        │
        ▼
AuthController.login() returns req.user
```

### 4.1 Guard

```typescript
// local-auth.guard.ts
export class LocalAuthGuard extends AuthGuard('local') {}
```

Same as `@UseGuards(AuthGuard('local'))`, just a named class.

### 4.2 Strategy

```typescript
// local.strategy.ts
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  validate(email: string, password: string) {
    return this.authService.validateUser(email, password);
  }
}
```

- `PassportStrategy(Strategy)` registers the name `"local"` on Passport **when Nest creates this provider**.
- `usernameField: 'email'` so the body can use `email` instead of `username`.

### 4.3 Service

```typescript
// auth.service.ts
async validateUser(email: string, password: string) {
  const user = await this.clientService.findByEmail(email);
  if (!user) throw new UnauthorizedException('User not found');

  const ok = await bcrypt.compare(password, user.data?.password || '');
  if (!ok) throw new UnauthorizedException('Invalid password');

  return { user: user.data?.id };
}
```

Whatever `validate()` / `validateUser()` **returns** is attached as `req.user`. The controller currently returns that object (no JWT yet).

### 4.4 Module (required)

```typescript
// auth.module.ts
providers: [AuthService, ClientService, LocalStrategy],
```

`LocalStrategy` **must** be listed here. Creating the file is not enough.

---

## 5. Try it

Create a client first (`POST /clients` with `name`, `email`, `password` — the entity hook hashes the password).

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@test.com","password":"secret123"}'
```

| Result | Meaning |
|--------|---------|
| `200` + `{ "user": <id> }` | Email + password matched |
| `401` | Unknown email or wrong password |
| `Unknown authentication strategy "local"` | `LocalStrategy` not in `providers` / missing `@Injectable()` |

---

## 6. Mental model

```
passport-local  =  how to READ credentials (body)
AuthService     =  how to CHECK them (TypeORM + bcrypt)
LocalAuthGuard  =  when to run that check (this route)
req.user        =  who passed the check
```

**Local ≠ JWT.** Local answers "are these credentials correct **right now**?" JWT answers "is this token still valid **on later requests**?" Next step is usually: after local login succeeds, sign a JWT and send `access_token`.
