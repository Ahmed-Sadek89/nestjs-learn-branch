# NestJS JWT in this project

How JWT works **in this repo right now**: packages, files, login, Bearer header, guard vs strategy, and `/users/me`.

There is **no Passport local strategy**. Login is a normal `POST` with `@Body()`. JWT is only used **after** login, on protected routes.

---

## 1. Packages

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/config
pnpm add -D @types/passport-jwt @types/bcrypt
```

| Package | Role |
|---------|------|
| **`@nestjs/jwt`** | `JwtModule` + `JwtService.sign()` after email + password match |
| **`passport`** | Registers strategies by name (`"jwt"`) |
| **`passport-jwt`** | Reads `Authorization: Bearer …`, checks signature + expiry |
| **`@nestjs/passport`** | `PassportStrategy`, `AuthGuard('jwt')` |
| **`@nestjs/config`** | Loads `.env`; `registerAs` / `asProvider` for JWT options |
| **`bcrypt`** | Compare plain password with the hash on `Client` |

Env (`.env` — do not commit real secrets):

```env
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1m
```

`jwt.config.ts` uses `process.env.JWT_EXPIRES_IN ?? '1m'`.

**One sentence:** login proves email + password and **signs** a token; Passport JWT **verifies** that token on later requests.

---

## 2. Files

```
src/auth/
  auth.module.ts                 # PassportModule + JwtModule.registerAsync(jwtConfig.asProvider())
  auth.service.ts                # login(): bcrypt + JwtService.sign({ sub, email })
  auth.controller.ts             # POST /auth/login (@Body) + GET /auth/me (@Request)
  dto/login.dto.ts
  config/jwt.config.ts           # registerAs('jwt', …) — secret + expiresIn from process.env
  strategies/jwt.strategy.ts     # HOW to verify (Bearer header, secret, validate → req.user)
  guard/jwt-auth/jwt-auth.guard.ts  # WHEN to verify + custom 401 messages

src/client/
  client.controller.ts           # GET /users/me — load user by req.user.userId
  client.service.ts              # findById, findByEmail (select password for login)
```

User table: `Client` mapped to `"users"`. `password` is `select: false` and hashed in `@BeforeInsert` / `@BeforeUpdate`.

---

## 3. Guard vs strategy (why both)

They are not duplicates.

| | **JwtAuthGuard** | **JwtStrategy** |
|---|------------------|-----------------|
| **Question** | Should **this route** require a token? | **How** do we check the token? |
| **Runs** | Only where you put `@UseGuards(JwtAuthGuard)` | When that guard calls the `"jwt"` strategy |
| **Without the other** | Strategy never runs → route stays public | `Unknown authentication strategy "jwt"` |

```
@UseGuards(JwtAuthGuard)     ← WHEN (this route is private)
        │
        ▼
AuthGuard('jwt')             ← look up strategy named "jwt"
        │
        ▼
JwtStrategy                  ← HOW (Bearer, secret, exp, req.user)
```

`JwtStrategy` **must** be in `AuthModule` `providers` (and `@Injectable()`). Creating the file is not enough.

A third piece: `JwtService.sign()` in `login()` **creates** the token. The strategy does not sign; it only **checks**.

---

## 4. `@Body()` vs `@Request()`

| Route | Decorator | Why |
|--------|-----------|-----|
| `POST /auth/login` | `@Body() dto: LoginDto` | Email + password are **in the JSON body**. No guard. |
| `GET /auth/me` | `@Request() req` | No body. Identity is **`req.user`** after the guard. |
| `GET /users/me` | `@Request() req` | Same: `req.user.userId` → load row from DB. |

`@Body()` = what the client typed.  
`@Request().user` = what the guard proved from the token.

If you used `@Body()` on `GET /me`, you would get `{}` / `undefined` (GET has no body). The guard would still run; you would just never see the decoded user.

---

## 5. Bearer header (not the raw JWT)

**Wrong** (token as-is):

```http
Authorization: eyJhbGciOi...
```

**Right:**

```http
Authorization: Bearer eyJhbGciOi...
```

```js
headers: { Authorization: `Bearer ${jwt}` }
```

The strategy uses:

```typescript
jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
secretOrKey: process.env.JWT_SECRET as string,
```

Passport strips `Bearer`, then verifies the rest. Raw token only → **401 Missing Bearer token**.

---

## 6. What happens

```
POST /auth/login
  @Body() { email, password }
        │
        ▼
AuthService.login
  1. findByEmail (must SELECT password — column is select: false)
  2. bcrypt.compare(plain, hash)
        │
        ├── fail → 401 "User not found" / "Invalid password"
        │
        ▼
JwtService.sign({ sub: id, email })
        │
        ▼
{ access_token, user: { id, email } }


GET /auth/me  or  GET /users/me
  Authorization: Bearer ${jwt}
        │
        ▼
JwtAuthGuard  →  AuthGuard('jwt')
        │
        ▼
JwtStrategy
  1. Extract token after "Bearer "
  2. Verify signature with JWT_SECRET
  3. Reject if expired
        │
        ├── fail → custom 401 (see §7)
        │
        ▼
validate({ sub, email })
  → req.user = { userId: sub, email }
        │
        ├── GET /auth/me     → return req.user          (payload only)
        └── GET /users/me    → findById(req.user.userId) (full user, no password)
```

`GET /users/me` is declared **before** `GET /users/:email` so `"me"` is not parsed as an email.

---

## 7. Custom 401 (guard `handleRequest`)

Passport’s default is `{ "message": "Unauthorized", "statusCode": 401 }`.  
`JwtAuthGuard.handleRequest` maps Passport `info` to a clearer message:

| Case | `message` |
|------|-----------|
| No `Authorization` / missing scheme | `Missing Bearer token` |
| Token past `exp` | `Token expired` |
| Bad signature / malformed | `Invalid token` |

Login 401s come from `AuthService` (`User not found` / `Invalid password`), not from this guard.

---

## 8. Config (`jwt.config.ts`)

```typescript
export default registerAs('jwt', (): JwtModuleOptions => ({
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1m',
  } as JwtModuleOptions['signOptions'],
}));
```

`AuthModule` wires it with:

```typescript
JwtModule.registerAsync(jwtConfig.asProvider())
```

`asProvider()` is Nest’s helper: same as `imports` / `inject` / `useFactory` inline. The strategy still reads `process.env.JWT_SECRET` itself for verify (must match the secret used to sign).

---

## 9. Try it

Create a user (`POST /users` needs a token, so create one while learning via seed or a temporary unguarded create). Then:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@test.com","password":"secret123"}' | jq -r .access_token)

# payload only
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer ${TOKEN}"

# full user from DB (id from token)
curl -s http://localhost:3000/users/me \
  -H "Authorization: Bearer ${TOKEN}"
```

| Result | Meaning |
|--------|---------|
| `200` + `{ access_token, user }` on login | Password matched; token signed |
| `200` + `{ userId, email }` on `/auth/me` | Token valid; returns JWT payload |
| `200` + user row on `/users/me` | Token valid; loaded `users` by `sub` |
| `401 Missing Bearer token` | Header missing or not `Bearer …` |
| `401 Token expired` | Past `JWT_EXPIRES_IN` |
| `401 Invalid token` | Wrong secret or malformed JWT |
| `Unknown authentication strategy "jwt"` | `JwtStrategy` not in `providers` |

---

## 10. Mental model

```
@Body()          = credentials the client typed (login only)
JwtService.sign  = CREATE the token
JwtAuthGuard     = WHEN to require a token
JwtStrategy      = HOW to READ + VERIFY Bearer ${jwt}
req.user         = { userId, email } after validate()
GET /users/me    = take userId from the token, load that row
```
