# What You Should Know in NestJS as a Beginner

A full beginner roadmap: **concepts → how Nest works → what to learn first → what to skip for now**.  
Use this with:

- [Model, Service & Controller](./learn-model-service-controller.md)
- [Decorators](./learn-decorators.md)

---

## 1. What is NestJS?

NestJS is a **Node.js framework** for building server-side apps (APIs, backends) with **TypeScript**.

It sits on top of:

- **Express** (default) or **Fastify** — the HTTP server
- **TypeScript** — types, classes, decorators
- **Dependency Injection** — Nest creates and connects your classes for you

### Why Nest (instead of plain Express)?

| Plain Express                         | NestJS                                      |
|---------------------------------------|---------------------------------------------|
| You invent folder structure           | Clear structure: modules, controllers, services |
| Easy to mix routes + logic            | Forces separation of concerns               |
| Harder as the app grows               | Scales with modules                         |
| Manual wiring                         | Built-in dependency injection               |

**One sentence:** Nest helps you build APIs that stay organized as they grow.

---

## 2. Prerequisites (before Nest feels easy)

You do **not** need to be an expert, but you should be comfortable with:

### Must know

1. **JavaScript basics** — variables, functions, arrays, objects, `async/await`
2. **TypeScript basics** — types, interfaces, classes, access modifiers (`private`, `readonly`)
3. **HTTP basics** — methods (`GET`, `POST`, `PATCH`, `DELETE`), status codes (`200`, `201`, `400`, `404`), JSON body, query params, path params
4. **npm/pnpm** — install packages, run scripts (`start:dev`, `build`)

### Nice to know (learn along the way)

- REST API design (`/users`, `/users/:id`)
- Environment variables (`.env`)
- Basic SQL or MongoDB ideas (when you add a database)

If TypeScript classes and `async/await` still feel fuzzy, learn those first — Nest uses them everywhere.

---

## 3. The Nest mental model (most important section)

Almost every Nest feature app is built from the same pieces:

```
Request
   │
   ▼
Controller   ← HTTP: routes, params, body, response
   │
   ▼
Service      ← business logic
   │
   ▼
Model / DTO / DB  ← data shape and storage
```

And everything is registered inside a **Module**.

| Piece          | Simple meaning                                      |
|----------------|-----------------------------------------------------|
| **Module**     | A folder/feature box that wires related code        |
| **Controller** | Receives HTTP requests                              |
| **Service**    | Contains the real logic                             |
| **DTO / Model**| Describes the shape of data                         |
| **Provider**   | Anything Nest can inject (usually services)         |
| **Decorator**  | `@Something()` labels that Nest reads               |

Your starter project already shows this:

```
src/
  main.ts           → starts the app
  app.module.ts     → root module
  app.controller.ts → handles GET /
  app.service.ts    → returns "Hello World!"
```

**Learn this flow first.** Everything else (guards, pipes, DB) plugs into it.

---

## 4. How a Nest app starts

### `main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

What happens:

1. Nest creates the application from `AppModule`
2. It reads all imported modules, controllers, providers
3. It builds the route map
4. The server listens on port `3000`

### `AppModule`

```ts
@Module({
  imports: [],              // other feature modules
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Rule:** if Nest should use a class (controller or service), it must be listed in a module (or imported via another module).

---

## 5. Core concepts you must understand

### 5.1 Modules

A module groups one feature (notes, users, tasks, auth).

```ts
@Module({
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService], // optional: share with other modules
})
export class NotesModule {}
```

Why modules matter:

- Keep features separated
- Control what is public (`exports`) vs private
- Make large apps navigable

**Beginner habit:** one feature folder = one module.

```
src/notes/
  notes.module.ts
  notes.controller.ts
  notes.service.ts
  notes.model.ts   (or dto/)
```

---

### 5.2 Controllers

Controllers answer: *“Which URL + method runs which method?”*

```ts
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll() {
    return this.notesService.findAll();
  }
}
```

Controller responsibilities:

- Define routes
- Read `@Body()`, `@Param()`, `@Query()`
- Call the service
- Return data (Nest turns it into JSON)

Controller should **not**:

- Contain heavy business rules
- Talk to the database directly (prefer service)

---

### 5.3 Services (providers)

Services answer: *“What should the app do?”*

```ts
@Injectable()
export class NotesService {
  findAll() {
    return [{ id: 1, title: 'First note' }];
  }
}
```

`@Injectable()` means Nest can create it and inject it into controllers (or other services).

---

### 5.4 Dependency Injection (DI)

This is Nest’s superpower.

**Without DI (manual):**

```ts
const service = new NotesService();
const controller = new NotesController(service);
```

**With Nest DI:**

```ts
constructor(private readonly notesService: NotesService) {}
```

You declare what you need. Nest creates it — **if** it is registered in a module’s `providers`.

If you see:

```text
Nest can't resolve dependencies of NotesController
```

it usually means the service is missing from `providers` / `imports`.

---

### 5.5 DTOs and models

- **Model / entity** — shape of a domain object (`Note`, `User`, `Task`)
- **DTO** (Data Transfer Object) — shape of data coming in/out of the API

```ts
export class CreateNoteDto {
  title: string;
  content: string;
}
```

Why beginners should care:

- Clear contracts for request bodies
- Later: validation with `class-validator`
- Safer than using `any`

---

### 5.6 Decorators

Decorators are labels Nest understands:

```ts
@Controller('notes')
@Get(':id')
@Body()
@Param('id')
@Injectable()
```

Full guide: [learn-decorators.md](./learn-decorators.md)

You do not need to write custom decorators at the beginning. Learn to **use** the built-in ones.

---

## 6. Request lifecycle (beginner version)

When a request hits Nest:

```
1. Incoming HTTP request
2. Middleware (optional)
3. Guards (auth / allow-deny)        ← learn after CRUD
4. Interceptors (before)             ← learn later
5. Pipes (transform / validate)      ← learn soon
6. Controller method
7. Service logic
8. Interceptors (after)
9. Response JSON
   (or Exception Filter if something threw)
```

At the beginning, focus on steps **6 → 7 → 9**.  
Then add **Pipes**, then **Guards**.

---

## 7. Errors and HTTP status codes

Nest has built-in HTTP exceptions:

```ts
import { NotFoundException, BadRequestException } from '@nestjs/common';

throw new NotFoundException('Note not found');     // 404
throw new BadRequestException('title is required'); // 400
```

Common codes:

| Code | Meaning              | When to use                    |
|------|----------------------|--------------------------------|
| 200  | OK                   | Successful GET/PATCH           |
| 201  | Created              | Successful POST create         |
| 204  | No Content           | Successful DELETE              |
| 400  | Bad Request          | Invalid input                  |
| 401  | Unauthorized         | Not logged in                  |
| 403  | Forbidden            | Logged in but not allowed      |
| 404  | Not Found            | Resource missing               |
| 500  | Internal Server Error| Unexpected server failure      |

**Beginner rule:** throw Nest exceptions in the service when business rules fail; let Nest format the error response.

---

## 8. What to learn, in order

### Phase 1 — Foundation (do this first)

1. Project structure (`main.ts`, `AppModule`, controller, service)
2. Create a feature module (Notes or Tasks)
3. Routes: `GET`, `GET/:id`, `POST`, `PATCH`, `DELETE`
4. `@Body`, `@Param`, `@Query`
5. In-memory service (array) — no database yet
6. `NotFoundException`

**Goal:** build a small CRUD API and understand the flow.

Practice from: [learn-model-service-controller.md](./learn-model-service-controller.md)

---

### Phase 2 — Input safety

1. DTOs as classes
2. Install and use `class-validator` + `class-transformer`
3. Global `ValidationPipe`

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // strip unknown fields
    forbidNonWhitelisted: true, // throw if unknown fields sent
    transform: true,            // auto-convert types when possible
  }),
);
```

```ts
import { IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  content: string;
}
```

**Goal:** invalid requests get `400` automatically.

---

### Phase 3 — Real data

Pick one:

- **Prisma + PostgreSQL/SQLite** (very popular, beginner-friendly)
- **TypeORM**
- **Mongoose** (MongoDB)

Learn:

1. Entity/model in the DB
2. Connect Nest to the DB
3. Move service methods from array → database calls
4. Basic migrations / schema push

**Goal:** data survives server restart.

---

### Phase 4 — Cross-cutting basics

1. **Config** — `@nestjs/config` and `.env` (`PORT`, `DATABASE_URL`)
2. **Guards** — protect routes (simple API key or JWT later)
3. **Logging** — Nest Logger or Pino
4. **Global prefix** — `app.setGlobalPrefix('api')` → `/api/notes`

---

### Phase 5 — Auth (when CRUD feels easy)

1. Register / login endpoints
2. Hash passwords (`bcrypt`)
3. JWT access tokens (`@nestjs/jwt`)
4. `AuthGuard` on protected routes
5. Current user decorator (`@Req()` user or custom `@CurrentUser()`)

Do **not** start Nest with auth on day one. Master CRUD + modules first.

---

## 9. Essential CLI commands

If you have the Nest CLI:

```bash
# generate a full resource (module + controller + service + DTOs)
nest g resource notes

# or piece by piece
nest g module notes
nest g controller notes
nest g service notes
```

Daily scripts (from your `package.json`):

```bash
pnpm start:dev   # watch mode — best while learning
pnpm build       # compile TypeScript
pnpm test        # unit tests
pnpm test:e2e    # end-to-end tests
```

Use **`start:dev`** while learning so changes reload automatically.

---

## 10. Folder structure that scales for beginners

```
src/
  main.ts
  app.module.ts
  app.controller.ts
  app.service.ts

  notes/
    notes.module.ts
    notes.controller.ts
    notes.service.ts
    dto/
      create-note.dto.ts
      update-note.dto.ts
    notes.model.ts          # or entity file later

  tasks/
    ...
```

Guidelines:

- Group by **feature**, not by type alone (`notes/` not only `controllers/`)
- Keep controllers thin
- Put reusable logic in services
- One module per feature

---

## 11. Testing (what beginners should know)

You do not need advanced testing on day one, but know the two levels:

| Type            | What it tests                         | Tooling              |
|-----------------|----------------------------------------|----------------------|
| **Unit test**   | One service/class in isolation         | Jest + mocks         |
| **E2E test**    | Full HTTP request → response           | Jest + Supertest     |

Your project already has:

- `app.controller.spec.ts` — unit-style test
- `test/app.e2e-spec.ts` — e2e test

**Beginner goal:** understand that services are easy to unit test because logic lives there (not in the controller).

---

## 12. Things that confuse beginners (and clear answers)

### “Where should this code go?”

| Kind of code                         | Put it in        |
|--------------------------------------|------------------|
| Route definition                     | Controller       |
| Read body/params                     | Controller       |
| Business rules, calculations         | Service          |
| DB queries                           | Service (or repository) |
| Data shape                           | DTO / model      |
| Wire classes together                | Module           |

### “Model vs DTO vs Entity?”

- **DTO** — API input/output contract
- **Model/interface** — TypeScript shape in code
- **Entity** — database table/collection mapping

They can look similar at first. Separating them becomes important as the app grows.

### “Why do I need a module?”

Nest only creates classes it knows about. Modules are the registry.

### “Can I put logic in the controller?”

You can, but don’t. It becomes messy fast. Controllers → HTTP, services → logic.

### “Do I need microservices / GraphQL / CQRS now?”

No. Those are advanced. Master REST + modules + DB + auth first.

---

## 13. What you can ignore as a beginner

Skip these until the basics feel natural:

- Microservices / RabbitMQ / Kafka
- GraphQL
- CQRS / Event Sourcing
- Complex custom decorators
- Advanced interceptors
- Monorepos / Nest CLI workspaces
- Passport strategies beyond a simple JWT
- Heavy Swagger customization (basic `@nestjs/swagger` is optional and fine later)

Focus beats FOMO.

---

## 14. Mini learning project plan

Build this in order:

### Project: Personal Notes API

1. `POST /notes` — create note  
2. `GET /notes` — list notes  
3. `GET /notes/:id` — get one  
4. `PATCH /notes/:id` — update  
5. `DELETE /notes/:id` — delete  
6. Add DTO validation  
7. Filter: `GET /notes?search=hello`  
8. Move storage from array → Prisma/SQLite  
9. Add `POST /auth/login` + protect note routes  

When you finish that, you are no longer a complete Nest beginner — you know the core.

---

## 15. Daily checklist while learning

- [ ] I can explain Module / Controller / Service in one sentence each  
- [ ] I can create a new feature module without copying blindly  
- [ ] I know the difference between `@Body`, `@Param`, and `@Query`  
- [ ] I can throw `NotFoundException` from a service  
- [ ] I understand why DI needs `providers`  
- [ ] I can validate a DTO with `ValidationPipe`  
- [ ] I can connect a database and replace in-memory storage  
- [ ] I know where to put auth later (guards), even if I have not built it yet  

---

## 16. Quick glossary

| Term | Meaning |
|------|---------|
| **NestFactory** | Creates the Nest application instance |
| **Module** | Feature container / registry |
| **Controller** | HTTP route handler class |
| **Provider** | Injectable class (often a service) |
| **DTO** | Data shape for requests/responses |
| **Pipe** | Transforms/validates input |
| **Guard** | Decides if a request may continue |
| **Interceptor** | Extra logic before/after a handler |
| **Filter** | Formats exceptions into HTTP responses |
| **DI** | Nest creates and injects dependencies |
| **CRUD** | Create, Read, Update, Delete |

---

## 17. Recommended study path (summary)

```
1. TypeScript + HTTP basics
2. Nest structure (module / controller / service)
3. Decorators for routing and request data
4. In-memory CRUD feature
5. DTOs + ValidationPipe
6. Database (Prisma is a great start)
7. Config + env
8. Auth (JWT) + Guards
9. Testing
10. Then explore advanced topics
```

---

## 18. Official resources

- [NestJS Documentation](https://docs.nestjs.com) — start with First steps, Controllers, Providers, Modules  
- [NestJS courses](https://courses.nestjs.com/) — optional paid deep dive  
- Your local guides:
  - [Model, Service & Controller](./learn-model-service-controller.md)
  - [Decorators](./learn-decorators.md)

---

## Final beginner advice

1. **Build small APIs** — reading alone is not enough.  
2. **Keep controllers thin** — this one habit prevents chaos.  
3. **One concept at a time** — routes → validation → DB → auth.  
4. **Use the error messages** — Nest dependency errors are usually “forgot to register provider/module”.  
5. **Prefer clarity over cleverness** — simple modules beat fancy patterns early on.

When you can build a validated CRUD module and explain how a request moves from controller → service → data, you have the Nest foundation everything else builds on.
