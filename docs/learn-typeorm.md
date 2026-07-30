# NestJS + TypeORM: Entities, Relations & Validation

A practical guide to **TypeORM** in NestJS: setup, entities, **every common relation**, and **validation** (DTO + entity).

Use this with:

- [PostgreSQL on WSL](./postgres-wsl-guide.md) — DB, tables, foreign keys
- [Model, Service & Controller](./learn-model-service-controller.md)
- [Beginner NestJS guide](./nestjs-beginner-guide.md)

---

## 1. What is TypeORM?

**TypeORM** is an **ORM** (Object-Relational Mapper). You write TypeScript **entity classes**; TypeORM maps them to **SQL tables** and runs queries for you.

```
HTTP Request
     │
     ▼
Controller  →  Service  →  Repository (TypeORM)  →  PostgreSQL
                              ▲
                         Entity classes
```

| Piece | Role |
|-------|------|
| **Entity** | Class = table; properties = columns |
| **Repository** | CRUD helpers for one entity (`find`, `save`, `delete`) |
| **Relation** | How entities link (`@OneToMany`, `@ManyToOne`, …) |
| **Migration** | Versioned SQL changes (preferred in real apps) |
| **DTO** | Shape of **incoming HTTP** data (validate with `class-validator`) |

**One sentence:** entities describe the DB; DTOs describe the API; services use repositories to talk to PostgreSQL.

---

## 2. Install & wire NestJS

### Packages

```bash
npm install @nestjs/typeorm typeorm pg
npm install class-validator class-transformer
# optional but useful for nested DTO validation:
# (class-transformer already needed for ValidationPipe)
```

`pg` = PostgreSQL driver. For MySQL use `mysql2`; for SQLite use `better-sqlite3` / `sqlite3`.

### Enable global validation (once in `main.ts`)

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // strip unknown fields
      forbidNonWhitelisted: true,   // 400 if unknown fields sent
      transform: true,              // auto-convert types (e.g. "1" → 1)
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### Connect TypeORM in `AppModule`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { Profile } from './profiles/profile.entity';
import { Post } from './posts/post.entity';
import { Category } from './categories/category.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'lear_nest',
      entities: [User, Profile, Post, Category],
      // learning only — use migrations in production
      synchronize: true,
      logging: true,
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

> **Warning:** `synchronize: true` auto-alters tables from entities. Fine while learning. For real apps use **migrations** and set `synchronize: false`.

### Feature module pattern

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Inject the repository in the service:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}
}
```

---

## 3. Entity basics (columns + common validators)

Entity validators run if you call `validate()` yourself or use a library that validates entities. In Nest APIs, **prefer validating DTOs** at the HTTP boundary; entity decorators document DB constraints and help when you persist nested graphs.

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column()
  @IsString()
  @MinLength(8)
  passwordHash: string;

  @Column({ length: 80 })
  @IsString()
  @Length(2, 80)
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  bio?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Column cheat sheet

| Decorator / option | Meaning |
|--------------------|---------|
| `@PrimaryGeneratedColumn()` | Auto-increment int PK |
| `@PrimaryGeneratedColumn('uuid')` | UUID PK |
| `@Column({ unique: true })` | Unique constraint |
| `@Column({ nullable: true })` | Allows `NULL` |
| `@Column({ default: … })` | DB default |
| `@Column({ type: 'enum', enum: Role })` | Enum column |
| `@Column({ type: 'decimal', precision: 10, scale: 2 })` | Money-like numbers |
| `@Column({ type: 'jsonb' })` | JSON (Postgres) |
| `@CreateDateColumn()` / `@UpdateDateColumn()` | Timestamps |
| `@DeleteDateColumn()` | Soft delete (`deletedAt`) |
| `@Index()` / `@Index(['a', 'b'])` | Indexes |

---

## 4. Relations overview

SQL relations map to TypeORM decorators like this:

| Relation | SQL idea | TypeORM (owning / inverse) |
|----------|----------|----------------------------|
| **One-to-One** | A row links to at most one other | `@OneToOne` + `@JoinColumn` on **one** side |
| **Many-to-One** | Many rows point to one | `@ManyToOne` (has FK) |
| **One-to-Many** | Inverse of many-to-one | `@OneToMany` |
| **Many-to-Many** | Join table in the middle | `@ManyToMany` + `@JoinTable` on **one** side |
| **Self-referencing** | Same table links to itself | Same decorators, same entity |

**Owning side** = side that owns the foreign key (or `@JoinTable`). Always put `@JoinColumn` / `@JoinTable` on exactly one side.

```
User 1 ── 1 Profile     (one-to-one)
User 1 ── * Post        (one-to-many / many-to-one)
Post  * ── * Category   (many-to-many)
User  * ── 1 User       (self: manager / reports)
```

---

## 5. One-to-One (`User` ↔ `Profile`)

One user has one profile; one profile belongs to one user.

### Entities

```typescript
// user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Profile } from '../profiles/profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column()
  @IsString()
  @Length(2, 80)
  name: string;

  // inverse side — no @JoinColumn here
  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  profile: Profile;
}
```

```typescript
// profile.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { User } from '../users/user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @Column({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

  // owning side — FK lives on profiles.userId
  @OneToOne(() => User, (user) => user.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
```

### DTO + validation

```typescript
// dto/create-profile.dto.ts
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
```

```typescript
// dto/create-user-with-profile.dto.ts
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateProfileDto } from './create-profile.dto';

export class CreateUserWithProfileDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile?: CreateProfileDto;
}
```

### Service usage

```typescript
async create(dto: CreateUserWithProfileDto) {
  const user = this.usersRepo.create({
    email: dto.email,
    name: dto.name,
    passwordHash: await hash(dto.password), // bcrypt in real apps
    profile: dto.profile ? this.profilesRepo.create(dto.profile) : undefined,
  });
  // cascade: ['insert'] on User.profile saves profile too
  return this.usersRepo.save(user);
}

async findOneWithProfile(id: string) {
  return this.usersRepo.findOne({
    where: { id },
    relations: { profile: true },
  });
}
```

---

## 6. Many-to-One / One-to-Many (`User` → `Post`)

Many posts belong to one user. FK is on `posts.authorId`.

### Entities

```typescript
// user.entity.ts (extra relation)
import { OneToMany } from 'typeorm';
import { Post } from '../posts/post.entity';

@OneToMany(() => Post, (post) => post.author)
posts: Post[];
```

```typescript
// post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { User } from '../users/user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  @IsString()
  @Length(3, 200)
  title: string;

  @Column({ type: 'text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  body: string;

  @ManyToOne(() => User, (user) => user.posts, {
    nullable: false,
    onDelete: 'CASCADE', // delete posts if user is deleted
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;
}
```

### DTO + validation

```typescript
// dto/create-post.dto.ts
import { IsNotEmpty, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @Length(3, 200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  body: string;

  @IsUUID()
  authorId: string;
}
```

### Service usage

```typescript
async createPost(dto: CreatePostDto) {
  const author = await this.usersRepo.findOneBy({ id: dto.authorId });
  if (!author) throw new NotFoundException('Author not found');

  const post = this.postsRepo.create({
    title: dto.title,
    body: dto.body,
    author,
  });
  return this.postsRepo.save(post);
}

async listPostsByUser(userId: string) {
  return this.postsRepo.find({
    where: { author: { id: userId } },
    relations: { author: true },
    order: { createdAt: 'DESC' },
  });
}

// from the User side:
async userWithPosts(id: string) {
  return this.usersRepo.findOne({
    where: { id },
    relations: { posts: true },
  });
}
```

---

## 7. Many-to-Many (`Post` ↔ `Category`)

A post has many categories; a category has many posts. TypeORM creates a **join table**.

### Entities

```typescript
// category.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Post } from '../posts/post.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 80 })
  @IsString()
  @Length(2, 80)
  name: string;

  @Column({ unique: true, length: 80 })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  @IsNotEmpty()
  slug: string;

  // inverse side — no @JoinTable
  @ManyToMany(() => Post, (post) => post.categories)
  posts: Post[];
}
```

```typescript
// post.entity.ts (extra relation)
import { ManyToMany, JoinTable } from 'typeorm';
import { Category } from '../categories/category.entity';

@ManyToMany(() => Category, (category) => category.posts, {
  cascade: false,
})
@JoinTable({
  name: 'post_categories',
  joinColumn: { name: 'postId', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
})
categories: Category[];
```

`@JoinTable` goes on **one** side only (usually the side you update from, e.g. Post).

### DTO + validation

```typescript
// dto/create-category.dto.ts
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;
}
```

```typescript
// dto/create-post-with-categories.dto.ts
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreatePostWithCategoriesDto {
  @IsString()
  @Length(3, 200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  body: string;

  @IsUUID()
  authorId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  categoryIds: string[];
}
```

### Service usage

```typescript
async createWithCategories(dto: CreatePostWithCategoriesDto) {
  const author = await this.usersRepo.findOneBy({ id: dto.authorId });
  if (!author) throw new NotFoundException('Author not found');

  const categories = await this.categoriesRepo.findBy({
    id: In(dto.categoryIds),
  });
  if (categories.length !== dto.categoryIds.length) {
    throw new BadRequestException('One or more categoryIds are invalid');
  }

  const post = this.postsRepo.create({
    title: dto.title,
    body: dto.body,
    author,
    categories,
  });
  return this.postsRepo.save(post);
}

async findPostWithCategories(id: string) {
  return this.postsRepo.findOne({
    where: { id },
    relations: { categories: true, author: true },
  });
}

// replace categories later
async setCategories(postId: string, categoryIds: string[]) {
  const post = await this.postsRepo.findOne({
    where: { id: postId },
    relations: { categories: true },
  });
  if (!post) throw new NotFoundException();

  post.categories = await this.categoriesRepo.findBy({ id: In(categoryIds) });
  return this.postsRepo.save(post);
}
```

---

## 8. Self-referencing (manager / reports)

Same entity relates to itself — e.g. employee → manager.

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @Length(2, 80)
  name: string;

  @ManyToOne(() => Employee, (manager) => manager.reports, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'managerId' })
  manager?: Employee | null;

  @OneToMany(() => Employee, (employee) => employee.manager)
  reports: Employee[];
}
```

### DTO

```typescript
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;
}
```

### Service

```typescript
async create(dto: CreateEmployeeDto) {
  let manager: Employee | null = null;
  if (dto.managerId) {
    manager = await this.employeesRepo.findOneBy({ id: dto.managerId });
    if (!manager) throw new NotFoundException('Manager not found');
  }

  const employee = this.employeesRepo.create({ name: dto.name, manager });
  return this.employeesRepo.save(employee);
}

async orgChart(id: string) {
  return this.employeesRepo.findOne({
    where: { id },
    relations: { manager: true, reports: true },
  });
}
```

---

## 9. Relation options you will use often

| Option | Where | Meaning |
|--------|-------|---------|
| `cascade: true` / `['insert','update']` | relation | Saving parent also saves related children |
| `eager: true` | relation | Always load relation (usually avoid; prefer explicit `relations`) |
| `nullable: false` | `@ManyToOne` | FK required |
| `onDelete: 'CASCADE'` | owning side | DB deletes children when parent deleted |
| `onDelete: 'SET NULL'` | owning side | Clears FK when parent deleted |
| `onDelete: 'RESTRICT'` | owning side | Block parent delete if children exist |
| `orphanedRowAction: 'delete'` | one-to-many | Removing child from array deletes the row |

### Loading relations

```typescript
// find options
await repo.find({ relations: { author: true, categories: true } });

// QueryBuilder (more control)
await repo
  .createQueryBuilder('post')
  .leftJoinAndSelect('post.author', 'author')
  .leftJoinAndSelect('post.categories', 'category')
  .where('post.id = :id', { id })
  .getOne();
```

### Soft deletes

```typescript
import { DeleteDateColumn } from 'typeorm';

@DeleteDateColumn()
deletedAt?: Date;

// softRemove / softDelete vs remove / delete
await repo.softDelete(id);
await repo.find({ withDeleted: true }); // include soft-deleted
```

---

## 10. Full mini domain (all relations together)

```
User 1 ── 1 Profile
User 1 ── * Post
Post  * ── * Category
Employee * ── 1 Employee (manager)
```

Suggested Nest modules:

```
src/
  users/
    user.entity.ts
    users.module.ts
    users.service.ts
    users.controller.ts
    dto/
  profiles/
    profile.entity.ts
  posts/
    post.entity.ts
    posts.module.ts
    posts.service.ts
    posts.controller.ts
    dto/
  categories/
    category.entity.ts
    categories.module.ts
    ...
  employees/
    employee.entity.ts
    ...
```

Register every entity in `TypeOrmModule.forRoot({ entities: [...] })` **or** use `autoLoadEntities: true` (Nest will load entities from `forFeature`).

```typescript
TypeOrmModule.forRoot({
  // ...
  autoLoadEntities: true,
  synchronize: true, // learning only
}),
```

---

## 11. Validation: DTO vs entity (what to do when)

| Layer | Job | Tools |
|-------|-----|-------|
| **DTO** | Validate **HTTP input** | `class-validator` + `ValidationPipe` |
| **Entity** | Map to **DB** + optional class-validator for nested saves | TypeORM columns + constraints |
| **DB** | Final truth | `UNIQUE`, `NOT NULL`, FK, `CHECK` |

**Rules of thumb:**

1. Always validate DTOs at the controller (`@Body()`).
2. Use `@ValidateNested()` + `@Type()` for nested objects (e.g. profile inside create-user).
3. Use `@IsUUID('4', { each: true })` for relation IDs arrays.
4. Check that related IDs **exist** in the service (`findOneBy` / `In(...)`) — validators cannot see the DB.
5. Put uniqueness / FK / `onDelete` on the **database** (entity column options), not only in TypeScript.

### Nested validation example (again, complete)

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';

class NestedProfileDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NestedProfileDto)
  profile?: NestedProfileDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  interestCategoryIds?: string[];
}
```

### Common validators for APIs

| Decorator | Use for |
|-----------|---------|
| `@IsNotEmpty()` | Required non-empty |
| `@IsOptional()` | Field may be omitted |
| `@IsString()` / `@IsInt()` / `@IsBoolean()` | Types |
| `@IsEmail()` / `@IsUrl()` / `@IsUUID()` | Formats |
| `@Length(min, max)` / `@MinLength()` / `@MaxLength()` | Strings |
| `@Min()` / `@Max()` | Numbers |
| `@IsEnum(MyEnum)` | Fixed set of values |
| `@IsArray()` + `{ each: true }` | Arrays |
| `@ValidateNested()` + `@Type()` | Nested objects |
| `@Matches(/regex/)` | Custom patterns (slugs, phones) |
| `@IsDateString()` | ISO date strings |

---

## 12. Controller sketch

```typescript
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostWithCategoriesDto } from './dto/create-post-with-categories.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Body() dto: CreatePostWithCategoriesDto) {
    return this.postsService.createWithCategories(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findPostWithCategories(id);
  }
}
```

`ParseUUIDPipe` validates the path param before the handler runs.

---

## 13. Migrations (when you leave “learning mode”)

```bash
npm install -D ts-node
```

1. Set `synchronize: false`.
2. Generate / write migrations with the TypeORM CLI (or `@nestjs/typeorm` docs patterns).
3. Run migrations in deploy pipelines.

Mental model:

```
Entity change → migration SQL → apply to DB → generate client/runtime still uses entities
```

(Postgres table design details: [postgres-wsl-guide.md](./postgres-wsl-guide.md).)

---

## 14. Quick troubleshooting

| Problem | Likely cause |
|---------|----------------|
| Relation always `undefined` | Forgot `relations: { … }` or `leftJoinAndSelect` |
| Duplicate join table columns | `@JoinTable` on **both** sides — keep on one |
| Circular import errors | Use `() => Entity` lazy functions in decorators (already shown) |
| Validation skips nested DTO | Missing `@ValidateNested()` and `@Type(() => NestedDto)` |
| FK violation on save | Related ID does not exist — load entity / check before save |
| Cascade not saving children | `cascade` not set on the side you `save()` |
| `synchronize` wiped data | Expected in learning — switch to migrations |

---

## 15. What to practice next

1. Create `User` + `Profile` (one-to-one) with nested DTO validation.
2. Add `Post` (many-to-one) and list posts by user.
3. Add `Category` + join table (many-to-many); attach categories by UUID array.
4. Add a self-referencing `Employee.manager`.
5. Turn off `synchronize` and write your first migration.

When that feels comfortable, learn **QueryBuilder**, **transactions** (`dataSource.transaction`), and **soft deletes**.
