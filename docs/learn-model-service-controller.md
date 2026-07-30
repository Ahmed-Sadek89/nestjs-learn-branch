# NestJS: Model, Service & Controller

A short guide to the three pieces you use most when building APIs in NestJS — with **easy**, **intermediate**, and **advanced (validation)** examples.

---

## The big picture

```
HTTP Request
     │
     ▼
┌────────────┐
│ Controller │  ← receives the request, picks params/body, returns the response
└─────┬──────┘
      │ calls
      ▼
┌────────────┐
│  Service   │  ← business logic (create, find, update, delete, rules)
└─────┬──────┘
      │ uses
      ▼
┌────────────┐
│   Model    │  ← shape of your data (TypeScript type / interface / class / DTO)
└────────────┘
```

| Piece        | Job                                              | Nest decorator      |
|--------------|--------------------------------------------------|---------------------|
| **Controller** | HTTP routes (`GET`, `POST`, …)                  | `@Controller()`     |
| **Service**    | Logic; controllers should stay thin             | `@Injectable()`     |
| **Model**      | Describes data (fields, types)                  | (plain TS / DTO)    |
| **Module**     | Wires controller + service together             | `@Module()`         |

> In Nest, “model” often means a **TypeScript interface/class** or a **DTO** (Data Transfer Object). With Prisma/TypeORM you also get database entities — same idea: the shape of the data.

Your starter app already shows the pattern:

- `AppController` → handles `GET /`
- `AppService` → returns `'Hello World!'`
- `AppModule` → registers both

---

## Roles in one sentence

- **Controller**: “What URL and method? What goes in/out of HTTP?”
- **Service**: “What should the app actually do?”
- **Model**: “What does a Todo / User / Order look like?”

---

## Nest CLI commands (create files before you edit them)

| Create… | Command | Notes |
|---------|---------|--------|
| Module | `nest g module notes` | Also registers the module in `AppModule` |
| Service | `nest g service notes --no-spec` | Adds provider to the feature module |
| Controller | `nest g controller notes --no-spec` | Adds controller to the feature module |
| DTO / class | `nest g class notes/dto/create-note.dto --no-spec` | Empty class — you fill fields |
| Full CRUD resource | `nest g resource notes --no-spec` | Module + controller + service + DTOs |
| Model / interface | *(no generator)* | Create `*.model.ts` manually |

Aliases work too: `nest g mo`, `nest g s`, `nest g co`, `nest g cl`, `nest g res`.

**Suggested order for a new feature:** module → service → controller → model/DTOs (manual or `nest g class`).

---

## Example 1 — Easy: Notes API (in-memory)

Goal: CRUD-lite for notes with no database — just an array in the service.

### Generate the feature (Nest CLI)

Run these from the project root (`lear-nest`). Prefer this order: **module → service → controller**.

```bash
# 1) Module — creates src/notes/notes.module.ts and registers NotesModule in AppModule
nest g module notes

# 2) Service — creates src/notes/notes.service.ts (+ spec) and adds it to NotesModule providers
nest g service notes --no-spec

# 3) Controller — creates src/notes/notes.controller.ts (+ spec) and adds it to NotesModule controllers
nest g controller notes --no-spec
```

`--no-spec` skips test files while you are learning. Drop it later when you want specs.

**Shortcut (optional):** one command creates module + controller + service + DTOs:

```bash
nest g resource notes --no-spec
# choose: REST API → yes to generate CRUD entry points
```

Then simplify the generated files to match this example, or keep following the step-by-step sections below.

### Folder layout (after CLI + model file)

```
src/notes/
  notes.model.ts      ← create manually (Nest has no `nest g model`)
  notes.service.ts
  notes.controller.ts
  notes.module.ts
```

### 1) Model — shape of a note

Nest CLI does **not** generate models/interfaces. Create the file yourself:

```bash
mkdir -p src/notes
touch src/notes/notes.model.ts
```

Or open `src/notes/notes.model.ts` in the editor and paste:

```ts
// src/notes/notes.model.ts
export interface Note {
  id: number;
  title: string;
  content: string;
}

export interface CreateNoteDto {
  title: string;
  content: string;
}
```

- `Note` = what you store and return
- `CreateNoteDto` = what the client sends when creating

### 2) Service — business logic

Generate (if you did not already):

```bash
nest g service notes --no-spec
```

Then replace the stub with:

```ts
// src/notes/notes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto, Note } from './notes.model';

@Injectable()
export class NotesService {
  private notes: Note[] = [];
  private nextId = 1;

  findAll(): Note[] {
    return this.notes;
  }

  findOne(id: number): Note {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new NotFoundException(`Note #${id} not found`);
    }
    return note;
  }

  create(dto: CreateNoteDto): Note {
    const note: Note = {
      id: this.nextId++,
      title: dto.title,
      content: dto.content,
    };
    this.notes.push(note);
    return note;
  }
}
```

### 3) Controller — HTTP layer

Generate (if you did not already):

```bash
nest g controller notes --no-spec
```

Then replace the stub with:

```ts
// src/notes/notes.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateNoteDto, Note } from './notes.model';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll(): Note[] {
    return this.notesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Note {
    return this.notesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateNoteDto): Note {
    return this.notesService.create(dto);
  }
}
```

### 4) Module — wire it up

Generate first (recommended as the **first** CLI step):

```bash
nest g module notes
```

Nest creates `notes.module.ts` and usually adds `NotesModule` to `AppModule.imports` for you. After you also generate the service and controller, the module should look like:

```ts
// src/notes/notes.module.ts
import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
```

If `AppModule` was not updated automatically, register it yourself:

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [NotesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Try it

```bash
# list
curl http://localhost:3000/notes

# create
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Nest","content":"Model + Service + Controller"}'

# get one
curl http://localhost:3000/notes/1
```

**What you practiced:** route → controller → service → model, plus DI via the constructor.

---

## Example 2 — Intermediate: Tasks API (status, filters, update, delete)

Goal: a richer resource with:

- enums for status
- separate create / update DTOs
- query filters (`?status=OPEN`)
- update + delete
- clear error handling

Still in-memory (no DB) so you can focus on Nest patterns.

### Generate the feature (Nest CLI)

```bash
# Module first (also wires TasksModule into AppModule)
nest g module tasks

# Service + controller
nest g service tasks --no-spec
nest g controller tasks --no-spec

# DTO classes (Nest generates empty class files you fill in)
nest g class tasks/dto/create-task.dto --no-spec
nest g class tasks/dto/update-task.dto --no-spec
nest g class tasks/dto/filter-tasks.dto --no-spec
```

**Shortcut:**

```bash
nest g resource tasks --no-spec
# REST API → generate CRUD entry points
```

Then adjust the generated DTOs/service/controller to match the code below (status enum, filters, UUID ids).

### Folder layout (after CLI + model file)

```
src/tasks/
  task.model.ts                 ← create manually
  dto/create-task.dto.ts
  dto/update-task.dto.ts
  dto/filter-tasks.dto.ts
  tasks.service.ts
  tasks.controller.ts
  tasks.module.ts
```

### 1) Model

No Nest generator for models — create it manually:

```bash
touch src/tasks/task.model.ts
```

```ts
// src/tasks/task.model.ts
export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: Date;
}
```

### 2) DTOs

Generate the class files first:

```bash
nest g class tasks/dto/create-task.dto --no-spec
nest g class tasks/dto/update-task.dto --no-spec
nest g class tasks/dto/filter-tasks.dto --no-spec
```

Then fill them in:

```ts
// src/tasks/dto/create-task.dto.ts
export class CreateTaskDto {
  title: string;
  description: string;
}
```

```ts
// src/tasks/dto/update-task.dto.ts
import { TaskStatus } from '../task.model';

export class UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
}
```

```ts
// src/tasks/dto/filter-tasks.dto.ts
import { TaskStatus } from '../task.model';

export class FilterTasksDto {
  status?: TaskStatus;
  search?: string;
}
```

> Later you can add `class-validator` (`@IsString()`, `@IsEnum()`, …) on these DTOs and enable `ValidationPipe` globally.

### 3) Service

Generate:

```bash
nest g service tasks --no-spec
```

Then replace the stub with:

```ts
// src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus } from './task.model';

@Injectable()
export class TasksService {
  private tasks: Task[] = [];

  findAll(filter: FilterTasksDto): Task[] {
    let result = [...this.tasks];

    if (filter.status) {
      result = result.filter((t) => t.status === filter.status);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    return result;
  }

  findOne(id: string): Task {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new NotFoundException(`Task "${id}" not found`);
    }
    return task;
  }

  create(dto: CreateTaskDto): Task {
    const task: Task = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      status: TaskStatus.OPEN,
      createdAt: new Date(),
    };
    this.tasks.push(task);
    return task;
  }

  update(id: string, dto: UpdateTaskDto): Task {
    const task = this.findOne(id);

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;

    return task;
  }

  remove(id: string): void {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Task "${id}" not found`);
    }
    this.tasks.splice(index, 1);
  }
}
```

### 4) Controller

Generate:

```bash
nest g controller tasks --no-spec
```

Then replace the stub with:

```ts
// src/tasks/tasks.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.model';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() filter: FilterTasksDto): Task[] {
    return this.tasksService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Task {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto): Task {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto): Task {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): void {
    this.tasksService.remove(id);
  }
}
```

### 5) Module

Generate first:

```bash
nest g module tasks
```

After service + controller are generated, confirm it looks like:

```ts
// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
```

Import `TasksModule` in `AppModule` the same way as `NotesModule` (usually done automatically by `nest g module tasks`).

### Try it

```bash
# create
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship feature","description":"Finish Nest module"}'

# list open tasks
curl "http://localhost:3000/tasks?status=OPEN"

# search
curl "http://localhost:3000/tasks?search=ship"

# update status (replace ID)
curl -X PATCH http://localhost:3000/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# delete
curl -X DELETE http://localhost:3000/tasks/<id>
```

**What you practiced:** enums, DTO split, query filters, `PATCH`/`DELETE`, UUID ids, and keeping HTTP concerns in the controller only.

---

## Example 3 — Advanced: Products API with validations

Goal: same model → service → controller pattern, plus **real input validation** so bad requests fail with `400` before your service runs.

You will use:

- `class-validator` — field rules (`@IsString()`, `@MinLength()`, …)
- `class-transformer` — turn plain JSON into class instances
- Nest `ValidationPipe` — run those rules on `@Body()` / `@Query()`
- `@nestjs/mapped-types` — build `UpdateProductDto` from `CreateProductDto`
- `ParseUUIDPipe` — validate path ids

### Install packages

```bash
pnpm add class-validator class-transformer @nestjs/mapped-types
# or: npm i class-validator class-transformer @nestjs/mapped-types
```

### Enable ValidationPipe globally

Edit `src/main.ts` **before** building the feature (validation does nothing without this):

```ts
// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strip properties not in the DTO
      forbidNonWhitelisted: true, // 400 if client sends unknown fields
      transform: true,            // auto-convert payloads to DTO classes / types
      transformOptions: {
        enableImplicitConversion: true, // "10" query → number when typed as number
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

| Option | Effect |
|--------|--------|
| `whitelist` | Remove extra body fields not declared on the DTO |
| `forbidNonWhitelisted` | Reject the request instead of silently stripping |
| `transform` | Needed so `@Body()` is a real class instance validators can read |
| `enableImplicitConversion` | Helps query params like `?minPrice=10` become numbers |

### Generate the feature (Nest CLI)

```bash
nest g module products
nest g service products --no-spec
nest g controller products --no-spec

nest g class products/dto/create-product.dto --no-spec
nest g class products/dto/update-product.dto --no-spec
nest g class products/dto/filter-products.dto --no-spec
```

**Shortcut:**

```bash
nest g resource products --no-spec
```

Then replace generated DTOs with the validated versions below.

### Folder layout

```
src/products/
  product.model.ts
  dto/create-product.dto.ts
  dto/update-product.dto.ts
  dto/filter-products.dto.ts
  products.service.ts
  products.controller.ts
  products.module.ts
```

### 1) Model

```bash
touch src/products/product.model.ts
```

```ts
// src/products/product.model.ts
export enum ProductCategory {
  ELECTRONICS = 'ELECTRONICS',
  BOOKS = 'BOOKS',
  CLOTHING = 'CLOTHING',
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
  tags: string[];
  createdAt: Date;
}
```

### 2) DTOs — with validation decorators

Generate (if needed):

```bash
nest g class products/dto/create-product.dto --no-spec
nest g class products/dto/update-product.dto --no-spec
nest g class products/dto/filter-products.dto --no-spec
```

**Create DTO** — every field the client must/may send:

```ts
// src/products/dto/create-product.dto.ts
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProductCategory } from '../product.model';

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  price: number;

  @IsNumber()
  @Min(0)
  @Max(100_000)
  stock: number;

  @IsEnum(ProductCategory, {
    message: `category must be one of: ${Object.values(ProductCategory).join(', ')}`,
  })
  category: ProductCategory;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  tags: string[];
}
```

**Update DTO** — reuse create rules, all fields optional:

```ts
// src/products/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// Every CreateProductDto field becomes optional, validators kept
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

**Filter DTO** — validate query strings (`GET /products?category=BOOKS&minPrice=10`):

```ts
// src/products/dto/filter-products.dto.ts
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ProductCategory } from '../product.model';

export class FilterProductsDto {
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  @MinLength(2)
  search?: string;

  @IsOptional()
  @Type(() => Number) // query values arrive as strings
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
```

#### Validator cheat sheet (common ones)

| Decorator | Meaning |
|-----------|---------|
| `@IsString()` | Must be a string |
| `@IsNumber()` | Must be a number |
| `@IsEnum(E)` | Must be a value of enum `E` |
| `@IsArray()` / `@IsString({ each: true })` | Array of strings |
| `@IsOptional()` | Skip other rules if value is `null`/`undefined` |
| `@MinLength(n)` / `@MaxLength(n)` | String length |
| `@Min(n)` / `@Max(n)` | Numeric bounds |
| `@ArrayNotEmpty()` | Array must have at least one item |
| `@IsEmail()` | Valid email (use on user DTOs) |
| `@IsUUID()` | Valid UUID string |

Decorators alone do **nothing** until `ValidationPipe` runs.

### 3) Service

```bash
nest g service products --no-spec
```

```ts
// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.model';

@Injectable()
export class ProductsService {
  private products: Product[] = [];

  findAll(filter: FilterProductsDto): Product[] {
    let result = [...this.products];

    if (filter.category) {
      result = result.filter((p) => p.category === filter.category);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (filter.minPrice !== undefined) {
      result = result.filter((p) => p.price >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined) {
      result = result.filter((p) => p.price <= filter.maxPrice!);
    }

    return result;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product "${id}" not found`);
    }
    return product;
  }

  create(dto: CreateProductDto): Product {
    const product: Product = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      category: dto.category,
      tags: dto.tags,
      createdAt: new Date(),
    };
    this.products.push(product);
    return product;
  }

  update(id: string, dto: UpdateProductDto): Product {
    const product = this.findOne(id);
    Object.assign(product, dto);
    return product;
  }

  remove(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Product "${id}" not found`);
    }
    this.products.splice(index, 1);
  }
}
```

Notice: the service does **not** re-check `@MinLength` etc. That is the pipe’s job. The service still owns business rules (e.g. not-found).

### 4) Controller

```bash
nest g controller products --no-spec
```

```ts
// src/products/products.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.model';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() filter: FilterProductsDto): Product[] {
    return this.productsService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Product {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto): Product {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Product {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): void {
    this.productsService.remove(id);
  }
}
```

`ParseUUIDPipe` rejects non-UUID `:id` values with `400` (before `findOne` runs).

### 5) Module

```bash
nest g module products
```

```ts
// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

Confirm `ProductsModule` is in `AppModule.imports`.

### Request flow with validation

```
POST /products  { bad or incomplete JSON }
        │
        ▼
ValidationPipe  →  runs class-validator on CreateProductDto
        │
        ├─ invalid → 400 Bad Request (service never called)
        │
        └─ valid   → ProductsController.create(dto)
                            │
                            ▼
                     ProductsService.create(dto)
```

### Try it

Start the app (`pnpm start:dev`), then:

```bash
# ✅ valid create
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nest Handbook",
    "description": "A practical guide to NestJS modules and pipes",
    "price": 29.99,
    "stock": 50,
    "category": "BOOKS",
    "tags": ["nestjs", "backend"]
  }'

# ❌ too-short name → 400
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AB",
    "description": "A practical guide to NestJS modules and pipes",
    "price": 29.99,
    "stock": 50,
    "category": "BOOKS",
    "tags": ["nestjs"]
  }'

# ❌ unknown field (forbidNonWhitelisted) → 400
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nest Handbook",
    "description": "A practical guide to NestJS modules and pipes",
    "price": 29.99,
    "stock": 50,
    "category": "BOOKS",
    "tags": ["nestjs"],
    "hacked": true
  }'

# ❌ invalid category → 400
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nest Handbook",
    "description": "A practical guide to NestJS modules and pipes",
    "price": 29.99,
    "stock": 50,
    "category": "FOOD",
    "tags": ["nestjs"]
  }'

# ✅ filtered list
curl "http://localhost:3000/products?category=BOOKS&minPrice=10"

# ❌ bad UUID param → 400
curl http://localhost:3000/products/not-a-uuid
```

Example `400` body shape (message text may vary):

```json
{
  "statusCode": 400,
  "message": [
    "name must be longer than or equal to 3 characters"
  ],
  "error": "Bad Request"
}
```

### Validation vs business rules

| Kind | Where | Example |
|------|--------|---------|
| **Input validation** | DTO + `ValidationPipe` | name length, enum, price ≥ 0 |
| **Business rule** | Service | product not found, stock cannot go below reserved orders |

Keep format/shape checks in DTOs. Keep domain decisions in the service.

**What you practiced:** global `ValidationPipe`, `class-validator` on DTOs, `PartialType`, query validation with `@Type(() => Number)`, `ParseUUIDPipe`, and rejecting bad input before the service.

---

## How the pieces talk (request flow)

```
POST /tasks  { "title": "...", "description": "..." }
        │
        ▼
TasksController.create(@Body() dto)
        │
        ▼
TasksService.create(dto)  → builds Task from model → stores it
        │
        ▼
HTTP 201/200 + Task JSON
```

Dependency injection: Nest creates `TasksService` and passes it into the controller constructor. You never `new TasksService()` yourself.

---

## Quick rules of thumb

1. **Controllers stay thin** — parse HTTP, call service, return result.
2. **Services own rules** — validation of business rules, filtering, not-found checks.
3. **Models/DTOs describe data** — don’t put HTTP or DB access in them.
4. **One feature = one module** — `NotesModule`, `TasksModule`, …
5. **Never put business logic in the controller** — if you’re writing `if`/`for` there, move it to the service.

---

## Map back to your starter

| Your file            | Role                          |
|----------------------|-------------------------------|
| `app.controller.ts`  | Controller (`GET /`)          |
| `app.service.ts`     | Service (`getHello`)          |
| `app.module.ts`      | Module (registers both)       |
| *(no model yet)*     | Add when you have real data   |

---

## What to learn next

1. Prisma or TypeORM for a real database “model” / entity  
2. Guards (auth) and Interceptors (logging / transform)  
3. Custom validators (`registerDecorator`) for cross-field rules  
4. Unit-test the service; e2e-test the controller (assert `400` on bad DTOs)  

Official docs: [Controllers](https://docs.nestjs.com/controllers) · [Providers](https://docs.nestjs.com/providers) · [Modules](https://docs.nestjs.com/modules) · [Validation](https://docs.nestjs.com/techniques/validation) · [Mapped types](https://docs.nestjs.com/openapi/mapped-types)
