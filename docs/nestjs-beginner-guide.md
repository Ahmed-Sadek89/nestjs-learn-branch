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


| Plain Express               | NestJS                                          |
| --------------------------- | ----------------------------------------------- |
| You invent folder structure | Clear structure: modules, controllers, services |
| Easy to mix routes + logic  | Forces separation of concerns                   |
| Harder as the app grows     | Scales with modules                             |
| Manual wiring               | Built-in dependency injection                   |


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


| Piece           | Simple meaning                               |
| --------------- | -------------------------------------------- |
| **Module**      | A folder/feature box that wires related code |
| **Controller**  | Receives HTTP requests                       |
| **Service**     | Contains the real logic                      |
| **DTO / Model** | Describes the shape of data                  |
| **Provider**    | Anything Nest can inject (usually services)  |
| **Decorator**   | `@Something()` labels that Nest reads        |


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

