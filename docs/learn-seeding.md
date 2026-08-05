# NestJS + TypeORM: Seeding with `typeorm-extension` & `@faker-js/faker`

A practical guide to **database seeding** for this project: fake data with **Faker**, factories/seeds with **typeorm-extension**, and how to seed **your real relations** (`Client` → `Profile` → `Post` ↔ `Tag`).

Use this with:

- [TypeORM entities & relations](./learn-typeorm.md)
- [PostgreSQL on WSL](./postgres-wsl-guide.md)
- [ERD](./erd.md)

---

## 1. What is seeding?

**Seeding** fills the database with sample (or required) rows so you can develop and test without clicking through the API every time.

| Piece | Role |
|-------|------|
| **Factory** | Blueprint: “how to build one fake `Client` / `Post` / …” |
| **Seeder** | Script that runs factories and `save()`s into the DB |
| **Faker** | Generates realistic fake values (names, emails, paragraphs, …) |
| **typeorm-extension** | Adds `setSeederFactory`, `runSeeders`, and a CLI around TypeORM |

**One sentence:** factories invent rows; seeders decide *how many* and *in which order* (critical for FKs).

```
Factory (faker)  →  Seeder (order + relations)  →  TypeORM save  →  PostgreSQL
```

---

## 2. Your entity graph (seed order depends on this)

```
Client ──1:1──► Profile          (FK lives on profiles.client_id)
   │                │
   │ 1:N            │ 1:N
   ▼                ▼
              Post               (FKs: posts.client_id, posts.profile_id)
                │
                │ N:M
                ▼
              Tag                (join table: posts_tags)
```

| Relation | Owning side (has FK / JoinTable) | Cascade in your code |
|----------|----------------------------------|----------------------|
| Client ↔ Profile | **Profile** (`@JoinColumn` → `client_id`) | Client → Profile `cascade: true` |
| Client → Posts | **Post** (`client_id`) | Client → Posts `cascade: true` |
| Profile → Posts | **Post** (`profile_id`) | Profile → Posts `cascade: true` |
| Post ↔ Tag | **Tag** (`@JoinTable` → `posts_tags`) | Post → Tags `cascade: true` |

**Safe seed order (always works):**

1. `Client`
2. `Profile` (needs an existing `Client`)
3. `Tag` (independent — no FK to clients/posts)
4. `Post` (needs `Client` + `Profile`; attach `Tag[]`)

You *can* create Client + Profile (+ Posts) in one `save()` because of cascade — see §8.

---

## 3. Folder structure

Keep seeding **outside** feature modules so factories/seeders stay CLI-friendly and do not mix with Nest controllers/services.

```
lear-nest/
├── package.json                          # "seed" script
├── lib/
│   └── db-config.ts                      # Nest TypeOrmModule config (unchanged)
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── client/
│   │   └── entities/client.entity.ts
│   ├── profile/
│   │   └── entities/profile.entity.ts
│   ├── post/
│   │   └── entities/post.entity.ts
│   ├── tag/
│   │   └── entities/tag.entity.ts
│   ├── book/
│   │   └── book.entity.ts
│   │
│   └── database/                         # ← all seeding lives here
│       ├── data-source.ts                # standalone TypeORM DataSource + SeederOptions
│       ├── seed.ts                       # entry: initialize → runSeeders → destroy
│       │
│       ├── factories/                    # one factory file per entity (Faker blueprints)
│       │   ├── client.factory.ts
│       │   ├── profile.factory.ts
│       │   ├── post.factory.ts
│       │   ├── tag.factory.ts
│       │   └── book.factory.ts
│       │
│       └── seeds/                        # seeders orchestrate order + relations
│           ├── main.seeder.ts            # primary seeder (clients → profiles → posts/tags)
│           └── demo.seeder.ts            # optional smaller/demo seeder
│
└── docs/
    └── learn-seeding.md                  # this guide
```

| Path | Responsibility |
|------|----------------|
| `src/database/data-source.ts` | DB connection for CLI; lists `entities`, `factories`, `seeds` |
| `src/database/seed.ts` | Runnable entry point (`pnpm seed`) |
| `src/database/factories/*.factory.ts` | How to invent **one** fake row (no FK wiring) |
| `src/database/seeds/*.seeder.ts` | How many rows, **order**, and relation wiring |
| Feature `entities/` | Unchanged — factories import from here |

**Globs** (must match this layout) in `data-source.ts`:

```typescript
factories: ['src/database/factories/**/*{.ts,.js}'],
seeds: ['src/database/seeds/**/*{.ts,.js}'],
```

**Optional alternative** (same idea, different root name):

```
src/
└── database/
    ├── data-source.ts
    ├── seed.ts
    ├── factories/
    └── seeders/          # some repos name this folder "seeders" instead of "seeds"
```

If you rename the folder, update the `seeds:` glob to match.

**What not to do:** put factories inside `client/` / `post/` modules unless you also teach Nest to load them — the CLI DataSource will not see Nest module folders automatically.

---

## 4. Install

```bash
pnpm add -D typeorm-extension @faker-js/faker
```

`typeorm-extension` is usually a **devDependency** (seeders run locally / in CI, not in production runtime).

Add npm scripts (example):

```json
{
  "scripts": {
    "seed": "ts-node -r tsconfig-paths/register ./src/database/seed.ts",
    "seed:run": "pnpm seed"
  }
}
```

> Your Nest app uses `autoLoadEntities: true` in `lib/db-config.ts`. The **seed DataSource** must list entities explicitly (CLI has no Nest DI).

---

## 5. DataSource for seeding

Create a standalone TypeORM `DataSource` (not Nest’s `TypeOrmModule`). Path suggestion: `src/database/data-source.ts`.

```typescript
// src/database/data-source.ts
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { Client } from '../client/entities/client.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Post } from '../post/entities/post.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Book } from '../book/book.entity';

const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'typeorm_user',
  password: '1234',
  database: 'typeorm_database',
  synchronize: true, // fine for learning; prefer migrations in real apps
  logging: false,
  entities: [Client, Profile, Post, Tag, Book],
  // typeorm-extension
  factories: ['src/database/factories/**/*{.ts,.js}'],
  seeds: ['src/database/seeds/**/*{.ts,.js}'],
};

export const AppDataSource = new DataSource(options);
```

Entry script that runs all seeders:

```typescript
// src/database/seed.ts
import 'reflect-metadata';
import { runSeeders } from 'typeorm-extension';
import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  await runSeeders(AppDataSource);
  await AppDataSource.destroy();
  console.log('✅ Seeding complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run:

```bash
pnpm seed
```

---

## 6. Factories with Faker (one per entity)

Factories describe **one** entity instance. They should **not** invent related rows by default — seeders wire relations.

### Client factory

```typescript
// src/database/factories/client.factory.ts
import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Client } from '../../client/entities/client.entity';

export default setSeederFactory(Client, () => {
  const client = new Client();
  client.name = faker.person.fullName().slice(0, 50);
  client.email = faker.internet.email().toLowerCase().slice(0, 50);
  // createdAt has DB default — omit or set explicitly
  return client;
});
```

### Profile factory

```typescript
// src/database/factories/profile.factory.ts
import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Profile } from '../../profile/entities/profile.entity';

export default setSeederFactory(Profile, () => {
  const profile = new Profile();
  profile.bio = faker.person.bio().slice(0, 50);
  // profile.client MUST be set in the seeder (nullable: false)
  return profile;
});
```

### Tag factory

```typescript
// src/database/factories/tag.factory.ts
import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Tag } from '../../tag/entities/tag.entity';

export default setSeederFactory(Tag, () => {
  const tag = new Tag();
  // keep under length: 20
  tag.name = faker.helpers.arrayElement([
    'nestjs',
    'typeorm',
    'postgres',
    'api',
    'tips',
    'security',
    'testing',
  ]);
  // Or: tag.name = faker.lorem.word().slice(0, 20);
  return tag;
});
```

### Post factory

```typescript
// src/database/factories/post.factory.ts
import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Post } from '../../post/entities/post.entity';

export default setSeederFactory(Post, () => {
  const post = new Post();
  post.title = faker.lorem.sentence({ min: 2, max: 5 }).slice(0, 50);
  post.description = faker.lorem.paragraphs(2);
  // post.client, post.profile, post.tags → set in seeder
  return post;
});
```

### Book factory (no relations)

```typescript
// src/database/factories/book.factory.ts
import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Book } from '../../book/book.entity';

export default setSeederFactory(Book, () => {
  const book = new Book();
  book.title = faker.lorem.words({ min: 2, max: 5 }).slice(0, 50);
  book.description = faker.lorem.paragraph();
  book.author = faker.person.fullName().slice(0, 100);
  book.price = faker.number.int({ min: 5, max: 120 });
  book.isPublished = faker.datatype.boolean();
  return book;
});
```

**Faker tips for your column limits:**

| Column | Constraint | Faker pattern |
|--------|------------|---------------|
| `clients.name` | varchar(50) | `.slice(0, 50)` |
| `clients.email` | unique, varchar(50) | unique emails; avoid collisions on re-seed |
| `posts.title` | unique, varchar(50) | unique titles or truncate carefully |
| `tags.name` | varchar(20) | short words / fixed list |

---

## 7. Main seeder — wiring your relations

```typescript
// src/database/seeds/main.seeder.ts
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Client } from '../../client/entities/client.entity';
import { Profile } from '../../profile/entities/profile.entity';
import { Post } from '../../post/entities/post.entity';
import { Tag } from '../../tag/entities/tag.entity';
import { Book } from '../../book/book.entity';

export default class MainSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const clientFactory = factoryManager.get(Client);
    const profileFactory = factoryManager.get(Profile);
    const postFactory = factoryManager.get(Post);
    const tagFactory = factoryManager.get(Tag);
    const bookFactory = factoryManager.get(Book);

    // ── 0) Optional: wipe related tables (dev only) ─────────────
    // Order matters because of FKs (children first).
    await dataSource.query('TRUNCATE TABLE posts_tags, posts, tags, profiles, clients, books RESTART IDENTITY CASCADE');

    // ── 1) Tags (independent) ───────────────────────────────────
    const tags = await Promise.all(
      Array.from({ length: 8 }, () => tagFactory.save()),
    );

    // ── 2) Clients ──────────────────────────────────────────────
    const clients = await Promise.all(
      Array.from({ length: 5 }, () => clientFactory.save()),
    );

    // ── 3) One Profile per Client (1:1) ─────────────────────────
    const profiles: Profile[] = [];
    for (const client of clients) {
      const profile = await profileFactory.save({
        client, // sets profiles.client_id
      });
      profiles.push(profile);
    }

    // ── 4) Posts: ManyToOne Client + Profile, ManyToMany Tags ───
    for (const profile of profiles) {
      const client = profile.client; // already loaded from save({ client })
      // If client is missing on profile, use the matching clients[i] instead.

      const postCount = 2;
      for (let i = 0; i < postCount; i++) {
        const randomTags = fakerPick(tags, { min: 1, max: 3 });

        await postFactory.save({
          client,
          profile,
          tags: randomTags, // fills posts_tags join table
        });
      }
    }

    // ── 5) Books (standalone) ───────────────────────────────────
    await Promise.all(Array.from({ length: 10 }, () => bookFactory.save()));
  }
}

/** Pick N unique items from an array */
function fakerPick<T>(items: T[], opts: { min: number; max: number }): T[] {
  const count = Math.floor(
    Math.random() * (opts.max - opts.min + 1) + opts.min,
  );
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}
```

Or use Faker’s helper:

```typescript
import { faker } from '@faker-js/faker';

const randomTags = faker.helpers.arrayElements(tags, { min: 1, max: 3 });
```

---

## 8. Dealing with each relation type (your code)

### 8.1 OneToOne — `Client` ↔ `Profile`

**Facts from your entities:**

- `Profile` owns the FK: `@JoinColumn({ name: "client_id" })`
- `nullable: false` on the relation → every profile **must** have a client
- `Client.profile` has `cascade: true` → you can save nested profile from the client

**Option A — set the owning side (clearest):**

```typescript
const client = await clientFactory.save();
const profile = await profileFactory.save({ client });
```

**Option B — cascade from Client:**

```typescript
const client = await clientFactory.make(); // in-memory only
client.profile = await profileFactory.make(); // no client assigned yet
// When using cascade, assign on the parent and save parent:
await dataSource.getRepository(Client).save(client);
// TypeORM will insert client, then profile with client_id
```

> Prefer **Option A** while learning: owning side = where the FK column lives.

**Common mistake:** saving a `Profile` without `client` → DB / TypeORM error (`client_id` NOT NULL).

---

### 8.2 ManyToOne / OneToMany — `Post` → `Client` & `Post` → `Profile`

**Facts:**

- Post has **two** required FKs: `client_id` and `profile_id`
- Both use `onDelete: 'CASCADE'`
- In a consistent world, a post’s `profile.client` should be the same as `post.client`

**Seed correctly:**

```typescript
await postFactory.save({
  client: profile.client, // same person who owns the profile
  profile,
});
```

**Inconsistent seed (works in DB, weird in domain):**

```typescript
// Don't do this unless you intentionally want broken domain data
await postFactory.save({
  client: clients[0],
  profile: profiles[4], // belongs to a different client
});
```

**Cascade shortcut from Client:**

```typescript
const client = await clientFactory.make();
client.profile = await profileFactory.make();
client.posts = [
  await postFactory.make({ /* still need profile after save */ }),
];
```

Because Post also requires `profile`, cascade-from-Client alone is awkward. Easiest path:

1. Save client  
2. Save profile with `{ client }`  
3. Save posts with `{ client, profile }`

---

### 8.3 ManyToMany — `Post` ↔ `Tag`

**Facts:**

- `@JoinTable` is on **Tag** (`posts_tags` with `tag_id` + `post_id`)
- `Post.tags` has `cascade: true`
- You can attach tags when saving a post **or** attach posts when saving a tag

**From Post (recommended in seeders):**

```typescript
const tags = await tagFactory.saveMany(5); // if available, or loop save()
await postFactory.save({
  client,
  profile,
  tags: [tags[0], tags[2]],
});
```

**From Tag:**

```typescript
const tag = await tagFactory.make();
tag.posts = [post1, post2];
await dataSource.getRepository(Tag).save(tag);
```

**How TypeORM fills the join table:** when you `save()` an entity that has a populated relation array, TypeORM inserts/updates `posts_tags` rows.

**Re-attach later:**

```typescript
const postRepo = dataSource.getRepository(Post);
const post = await postRepo.findOne({
  where: { id: 1 },
  relations: { tags: true },
});
post!.tags = [...(post!.tags ?? []), newTag];
await postRepo.save(post!);
```

---

## 9. Full “happy path” seeder (copy-paste style)

Minimal version that mirrors your schema:

```typescript
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Client } from '../../client/entities/client.entity';
import { Profile } from '../../profile/entities/profile.entity';
import { Post } from '../../post/entities/post.entity';
import { Tag } from '../../tag/entities/tag.entity';

export default class DemoSeeder implements Seeder {
  async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    const clients = factoryManager.get(Client);
    const profiles = factoryManager.get(Profile);
    const posts = factoryManager.get(Post);
    const tags = factoryManager.get(Tag);

    // Tags first
    const allTags = await Promise.all([
      tags.save(),
      tags.save(),
      tags.save(),
      tags.save(),
    ]);

    // Client → Profile → Posts(+tags)
    for (let i = 0; i < 3; i++) {
      const client = await clients.save();
      const profile = await profiles.save({ client });

      await posts.save({
        client,
        profile,
        tags: faker.helpers.arrayElements(allTags, 2),
      });
      await posts.save({
        client,
        profile,
        tags: faker.helpers.arrayElements(allTags, 2),
      });
    }
  }
}
```

After seeding you should see roughly:

| Table | Rows (example) |
|-------|----------------|
| `clients` | 3 |
| `profiles` | 3 (1 per client) |
| `posts` | 6 |
| `tags` | 4 |
| `posts_tags` | ~12 (2 tags × 6 posts) |

Verify:

```sql
SELECT c.name, p.bio, po.title, t.name
FROM clients c
JOIN profiles p ON p.client_id = c.id
JOIN posts po ON po.profile_id = p.id
LEFT JOIN posts_tags pt ON pt.post_id = po.id
LEFT JOIN tags t ON t.id = pt.tag_id
ORDER BY c.id, po.id;
```

---

## 10. Nested cascade example (Client owns graph)

Because `Client` has `cascade: true` on `profile` and `posts`, and `Post` has `cascade: true` on `tags`:

```typescript
const clientRepo = dataSource.getRepository(Client);

const tagA = await factoryManager.get(Tag).save();
const tagB = await factoryManager.get(Tag).save();

const client = new Client();
client.name = faker.person.fullName().slice(0, 50);
client.email = faker.internet.email().toLowerCase().slice(0, 50);

const profile = new Profile();
profile.bio = 'I love NestJS';
client.profile = profile; // cascade inserts profile

const post = new Post();
post.title = `Hello ${faker.string.alphanumeric(6)}`.slice(0, 50);
post.description = 'First post';
post.profile = profile;   // still required on Post
post.tags = [tagA, tagB];
client.posts = [post];

await clientRepo.save(client);
// Inserts: client → profile → post → posts_tags
```

**Gotcha:** even with cascade from `Client`, `Post.profile` must still be set because that FK is required and separate from `client_id`.

---

## 11. Idempotent / re-runnable seeds

`save()` again will **duplicate** rows (unique emails/titles will explode).

Patterns:

**A. Truncate then seed (dev):**

```sql
TRUNCATE TABLE posts_tags, posts, tags, profiles, clients RESTART IDENTITY CASCADE;
```

**B. Skip if data exists:**

```typescript
const clientRepo = dataSource.getRepository(Client);
const count = await clientRepo.count();
if (count > 0) {
  console.log('Skip seed — already populated');
  return;
}
```

**C. Upsert by unique key:**

```typescript
await clientRepo.upsert(
  { email: 'demo@example.com', name: 'Demo User' },
  ['email'],
);
```

---

## 12. NestJS tip: seed without leaving Nest

CLI DataSource is enough for learning. If you prefer Nest DI:

```typescript
// scripts/seed-with-nest.ts (sketch)
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { runSeeders } from 'typeorm-extension';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  await runSeeders(dataSource);
  await app.close();
}
bootstrap();
```

You still need factories/seeds registered the same way on that `DataSource`.

---

## 13. Checklist for *this* project

- [ ] Create `src/database/{data-source.ts,seed.ts,factories/,seeds/}` as in §3
- [ ] Install `typeorm-extension` + `@faker-js/faker`
- [ ] Add `DataSource` with explicit `entities: [Client, Profile, Post, Tag, Book]`
- [ ] Factories respect varchar lengths (`name` 50, `tag.name` 20, unique email/title)
- [ ] Seed **Client before Profile** (or cascade together)
- [ ] Seed **Tags before or with Posts**
- [ ] Every **Post** gets both `client` and `profile` (same owner)
- [ ] ManyToMany: assign `post.tags = [...]` then `save`
- [ ] Decide truncate vs skip vs upsert before re-running
- [ ] Confirm with a JOIN query across `clients → profiles → posts → tags`

---

## 14. Mental model (cheat sheet)

```
Create parents first          →  Client, Tag
Create child with FK object  →  Profile { client }
Create grandchild with FKs   →  Post { client, profile, tags }
Join table fills itself      →  when tags[] is present on save
Cascade is optional sugar    →  owning side must still be correct
```

| Want this | Do this in seeder |
|-----------|-------------------|
| 1:1 Client–Profile | `profileFactory.save({ client })` |
| N posts for a profile | loop `postFactory.save({ client, profile })` |
| Tags on a post | `postFactory.save({ …, tags: selectedTags })` |
| Standalone books | `bookFactory.save()` anytime |

That’s the whole loop: **Faker invents fields → factories build entities → seeders respect FK order and relation owners.**
