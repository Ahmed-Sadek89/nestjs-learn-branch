# NestJS Decorators

Decorators are how Nest knows **what a class is** and **how HTTP should reach it**.  
This guide explains the idea, then groups the decorators you use every day.

---

## What is a decorator?

A decorator is a special TypeScript syntax that starts with `@` and sits above a class, method, parameter, or property.

```ts
@Controller('notes')          // class decorator
export class NotesController {
  @Get(':id')                 // method decorator
  findOne(
    @Param('id') id: string,  // parameter decorator
  ) {
    return id;
  }
}
```

Nest reads these at startup (via `reflect-metadata`) and builds:

- the route table (`GET /notes/:id`)
- dependency injection (`constructor(private service: NotesService)`)
- pipes, guards, interceptors attached to handlers

> You rarely write decorators yourself at first — you **use** Nest’s built-in ones.

---

## Mental model

```
@Decorator = metadata label Nest understands

@Controller('users')  →  "this class handles /users"
@Get()                →  "this method is GET"
@Inject() / ctor DI   →  "inject this dependency"
@Body()               →  "take the request body"
```

Without decorators, Nest would not know which methods are routes or how to inject services.

---

## 1) Class decorators

### `@Controller(path?)`

Marks a class as an HTTP controller. Optional path becomes the route prefix.

```ts
@Controller('notes')   // all routes start with /notes
export class NotesController {}
```

### `@Injectable()`

Marks a class as a **provider** Nest can inject (services, repositories, helpers).

```ts
@Injectable()
export class NotesService {
  findAll() {
    return [];
  }
}
```

### `@Module({ ... })`

Defines a module: what it imports, controllers, providers, and exports.

```ts
@Module({
  imports: [],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService], // other modules can use NotesService
})
export class NotesModule {}
```

---

## 2) Method decorators — HTTP verbs

These turn a method into a route handler.

| Decorator   | HTTP method | Typical use        |
|-------------|-------------|--------------------|
| `@Get()`    | GET         | Read / list        |
| `@Post()`   | POST        | Create             |
| `@Put()`    | PUT         | Full replace       |
| `@Patch()`  | PATCH       | Partial update     |
| `@Delete()` | DELETE      | Remove             |
| `@Head()`   | HEAD        | Headers only       |
| `@Options()`| OPTIONS     | CORS preflight     |
| `@All()`    | all verbs   | Catch-all          |

```ts
@Controller('notes')
export class NotesController {
  @Get()           // GET /notes
  findAll() {}

  @Get(':id')      // GET /notes/1
  findOne() {}

  @Post()          // POST /notes
  create() {}

  @Patch(':id')    // PATCH /notes/1
  update() {}

  @Delete(':id')   // DELETE /notes/1
  remove() {}
}
```

### Extra route metadata

```ts
@HttpCode(HttpStatus.NO_CONTENT)  // custom status (e.g. 204)
@Header('Cache-Control', 'none')  // set response header
@Redirect('https://nestjs.com', 302)
```

---

## 3) Parameter decorators — reading the request

These pull pieces of the incoming HTTP request into method arguments.

| Decorator            | What it gives you                          |
|----------------------|--------------------------------------------|
| `@Body()`            | Request JSON/body                          |
| `@Body('title')`     | One body field                             |
| `@Param('id')`       | Path param (`/notes/:id`)                  |
| `@Query('status')`   | Query string (`?status=OPEN`)              |
| `@Query()`           | Whole query object                         |
| `@Headers('user-agent')` | One header                            |
| `@Req()` / `@Request()` | Full Express/Fastify request            |
| `@Res()` / `@Response()` | Response object (avoid unless needed)  |
| `@Ip()`              | Client IP                                  |
| `@Session()`         | Session (if configured)                    |
| `@HostParam()`       | Subdomain host param                       |

```ts
@Post()
create(
  @Body() dto: CreateNoteDto,
  @Ip() ip: string,
) {
  return this.notesService.create(dto);
}

@Get(':id')
findOne(
  @Param('id', ParseIntPipe) id: number, // pipe transforms/validates
  @Query('include') include?: string,
) {
  return this.notesService.findOne(id);
}
```

**Tip:** Prefer `@Body()`, `@Param()`, `@Query()` over `@Req()`. They are clearer and easier to test.

---

## 4) Dependency injection (constructor)

You don’t always write `@Inject()` — Nest injects by type when the class is `@Injectable()` and listed in a module’s `providers`.

```ts
@Controller('notes')
export class NotesController {
  // Nest injects NotesService automatically
  constructor(private readonly notesService: NotesService) {}
}
```

Use `@Inject(TOKEN)` when injecting a custom token (string/symbol) or a non-class provider:

```ts
constructor(
  @Inject('CONFIG') private readonly config: AppConfig,
) {}
```

---

## 5) Pipes, Guards, Interceptors, Filters

These can sit on a **method**, a **controller**, or **globally**.

### Pipes — transform / validate input

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
```

Common built-ins: `ParseIntPipe`, `ParseUUIDPipe`, `ValidationPipe`, `DefaultValuePipe`.

### Guards — allow or deny access

```ts
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {}
```

### Interceptors — wrap before/after the handler

```ts
@UseInterceptors(LoggingInterceptor)
@Get()
findAll() {}
```

### Exception filters — shape error responses

```ts
@UseFilters(HttpExceptionFilter)
@Get(':id')
findOne() {}
```

| Decorator            | Role                                      |
|----------------------|-------------------------------------------|
| `@UsePipes()`        | Attach pipes                              |
| `@UseGuards()`       | Attach guards                             |
| `@UseInterceptors()` | Attach interceptors                       |
| `@UseFilters()`      | Attach exception filters                  |
| `@SetMetadata()`     | Attach custom metadata (roles, etc.)      |

---

## Easy example — see decorators in one place

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes') // class: route prefix
export class NotesController {
  constructor(private readonly notesService: NotesService) {} // DI

  @Get() // method: GET /notes
  findAll() {
    return this.notesService.findAll();
  }

  @Get(':id') // method: GET /notes/:id
  findOne(
    @Param('id', ParseIntPipe) id: number, // param + pipe
  ) {
    return this.notesService.findOne(id);
  }

  @Post() // method: POST /notes
  create(
    @Body() body: { title: string; content: string }, // body
  ) {
    return this.notesService.create(body);
  }
}
```

Match each `@...` to the tables above — that is most of day-to-day Nest.

---

## Intermediate example — guards, validation, custom metadata

Imagine protecting an admin route and validating the body.

```ts
import {
  Body,
  Controller,
  Get,
  Post,
  SetMetadata,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { RolesGuard } from './roles.guard';

class CreateAdminNoteDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  content: string;
}

@Controller('admin/notes')
@UseGuards(RolesGuard) // every route in this controller uses the guard
export class AdminNotesController {
  @Post()
  @SetMetadata('roles', ['admin']) // custom metadata the guard can read
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateAdminNoteDto) {
    return dto;
  }

  @Get()
  @SetMetadata('roles', ['admin', 'editor'])
  list() {
    return [];
  }
}
```

What each decorator does here:

| Decorator | Effect |
|-----------|--------|
| `@Controller('admin/notes')` | Prefix `/admin/notes` |
| `@UseGuards(RolesGuard)` | Check roles before handlers run |
| `@SetMetadata('roles', …)` | Store allowed roles for the guard |
| `@UsePipes(ValidationPipe)` | Validate/transform `@Body()` with DTO decorators |
| `@IsString()` / `@MinLength()` | **class-validator** field decorators on the DTO |
| `@Body()` | Pass validated body into `create` |

---

## Decorator execution order (useful when debugging)

For a single request, Nest roughly runs:

```
Guards → Interceptors (before) → Pipes → Handler → Interceptors (after) → Exception Filters (on error)
```

If a guard returns `false` / throws, the handler never runs.  
If a pipe throws, the handler never runs.

---

## Decorators you will meet later

| Decorator | Where | Purpose |
|-----------|--------|---------|
| `@InjectRepository()` | constructor | TypeORM repo injection |
| `@InjectModel()` | constructor | Mongoose model injection |
| `@Cron()` | method | Scheduled jobs (`@nestjs/schedule`) |
| `@EventPattern()` / `@MessagePattern()` | method | Microservice message handlers |
| `@ApiProperty()` | DTO field | Swagger/OpenAPI docs |
| `@Public()` (custom) | method | Skip auth (your own helper over `@SetMetadata`) |

---

## Common mistakes

1. **Forgetting `@Injectable()` on a service** → Nest can’t inject it cleanly.  
2. **Not registering the provider in a module** → `Nest can't resolve dependencies`.  
3. **Using `@Res()` and also `return`** → pick one style; prefer `return` + Nest response handling.  
4. **Wrong param name** → `@Param('noteId')` must match `:noteId` in the route.  
5. **Expecting DTO validation without `ValidationPipe`** → `@IsString()` alone does nothing until the pipe runs.

---

## Cheat sheet

```
Class
  @Module          wire the feature
  @Controller      HTTP entry
  @Injectable      injectable provider

Methods (HTTP)
  @Get @Post @Put @Patch @Delete

Parameters
  @Body @Param @Query @Headers @Req @Ip

Cross-cutting
  @UseGuards @UsePipes @UseInterceptors @UseFilters @SetMetadata

DI
  constructor(private svc: MyService)
  @Inject(TOKEN)
```

---

## Practice checklist

- [ ] Add `@Get('health')` that returns `{ ok: true }`  
- [ ] Add `@Param('id', ParseIntPipe)` and call with a non-number → see `400`  
- [ ] Add `@Query('q')` and log the search term  
- [ ] Create a tiny `@Injectable()` logger service and inject it into a controller  
- [ ] (Bonus) Add `ValidationPipe` globally in `main.ts` and a DTO with `@IsString()`

```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

---

## Related

- [Learn Model, Service & Controller](./learn-model-service-controller.md)  
- Official docs: [Controllers](https://docs.nestjs.com/controllers) · [Custom decorators](https://docs.nestjs.com/custom-decorators) · [Pipes](https://docs.nestjs.com/pipes) · [Guards](https://docs.nestjs.com/guards)
