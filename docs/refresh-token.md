# Refresh tokens

Access tokens are short-lived (`JWT_EXPIRES_IN`). A **refresh token** gets a new access token without logging in again.

Access JWT (Bearer header, `JwtAuthGuard`) is in [jwt-strategy.md](./jwt-strategy.md).

---

## 1. Env

```env
JWT_REFRESH_SECRET=change-me-to-a-different-long-random-string
JWT_REFRESH_EXPIRES_IN=7d
```

Use a **different** secret from `JWT_SECRET`.

---

## 2. Files

```
src/auth/
  config/refresh-jwt.config.ts             # JWT_REFRESH_SECRET + JWT_REFRESH_EXPIRES_IN
  strategies/refresh.strategy.ts           # Passport name "jwt-refresh"
  guard/refresh-auth/refresh-auth.guard.ts # AuthGuard('jwt-refresh')
  auth.service.ts                          # login() signs both; refreshAccess()
  auth.controller.ts                       # POST /auth/refresh
```

Same split as access JWT:

| | **RefreshAuthGuard** | **RefreshJwtStrategy** |
|---|----------------------|------------------------|
| **When** | `@UseGuards(RefreshAuthGuard)` on `/auth/refresh` | How to read + verify the refresh JWT |
| **Reads** | — | `Authorization: Bearer <refresh_token>` |
| **Secret** | — | `JWT_REFRESH_SECRET` |

---

## 3. Login

`POST /auth/login` returns both:

```json
{
  "access_token": "eyJ…",
  "refresh_token": "eyJ…",
  "user": { "id": 1, "email": "ada@test.com" }
}
```

- Access: `{ sub, email, typ: 'access' }` signed with `JWT_SECRET`
- Refresh: `{ sub, email, typ: 'refresh' }` signed with `JWT_REFRESH_SECRET`

A refresh JWT in `Authorization: Bearer` is rejected (`Access token required`).

---

## 4. POST /auth/refresh

Send the refresh token in the **Authorization header**. The refresh guard runs first.

```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

```
RefreshAuthGuard → AuthGuard('jwt-refresh')
        │
        ▼
RefreshJwtStrategy
  ExtractJwt.fromAuthHeaderWithScheme('Bearer')
  verify with JWT_REFRESH_SECRET
  typ must be "refresh"
        │
        ▼
req.user = { userId, email }
        │
        ▼
{ access_token: <new access JWT> }
```

---

## 5. Try it

```bash
LOGIN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@test.com","password":"secret123"}')

ACCESS=$(echo "$LOGIN" | jq -r .access_token)
REFRESH=$(echo "$LOGIN" | jq -r .refresh_token)

curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer ${ACCESS}"

curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer ${REFRESH}"
```

| Result | Meaning |
|--------|---------|
| `200` + `{ access_token, refresh_token, user }` | Login OK |
| `200` + `{ access_token }` on `/auth/refresh` | New access issued |
| `401 Missing refresh token` | No `Authorization: Bearer` header |
| `401 Refresh token expired` | Past `JWT_REFRESH_EXPIRES_IN` |
| `401 Invalid refresh token` | Wrong secret or access JWT sent as refresh |
