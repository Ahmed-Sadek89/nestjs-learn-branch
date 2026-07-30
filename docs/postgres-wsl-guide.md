# PostgreSQL on WSL Linux: Manage DB, Tables & Relations

A practical beginner guide for running **PostgreSQL (pgsql)** on **WSL (Ubuntu/Debian)**, creating databases, designing **tables**, and modeling **relations**.  
Useful before you connect NestJS (Prisma/TypeORM) to a real database.

Related Nest docs:

- [Beginner NestJS guide](./nestjs-beginner-guide.md)
- [Model, Service & Controller](./learn-model-service-controller.md)

---

## 1. What you are managing

| Piece | Meaning |
|-------|---------|
| **PostgreSQL server** | The database engine running in the background |
| **Database** | A named container for your app data (`notes_app`) |
| **Schema** | Namespace inside a DB (default is `public`) |
| **Table** | Rows + columns (like a spreadsheet with rules) |
| **Row** | One record |
| **Column** | One field (`id`, `title`, …) |
| **Relation** | How tables link (via foreign keys) |
| **psql** | Official CLI client for PostgreSQL |

Typical Nest flow later:

```
Nest Service → Prisma/TypeORM → PostgreSQL tables
```

This file focuses on the **PostgreSQL + WSL** side.

---

## 2. Install PostgreSQL on WSL

### Update packages

```bash
sudo apt update
sudo apt upgrade -y
```

### Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

Check version:

```bash
psql --version
```

---

## 3. Start / stop / status (service management)

On WSL, PostgreSQL usually runs as a systemd or service wrapper service named `postgresql`.

```bash
# status
sudo service postgresql status

# start
sudo service postgresql start

# stop
sudo service postgresql stop

# restart
sudo service postgresql restart
```

If your WSL distro uses systemd:

```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
sudo systemctl enable postgresql   # start on boot (when systemd works)
```

**WSL tip:** after restarting Windows/WSL, you often need:

```bash
sudo service postgresql start
```

Confirm it listens on the default port `5432`:

```bash
ss -lntp | grep 5432
# or
pg_isready
```

---

## 4. First login: the `postgres` OS user

PostgreSQL creates a Linux user named `postgres`. Switch to it:

```bash
sudo -u postgres psql
```

You should see:

```text
postgres=#
```

Useful meta-commands inside `psql`:

| Command | What it does |
|---------|----------------|
| `\l` | List databases |
| `\c dbname` | Connect to a database |
| `\dt` | List tables |
| `\d table_name` | Describe a table (columns, keys) |
| `\du` | List roles/users |
| `\q` | Quit |
| `\?` | Help for psql commands |
| `\h CREATE TABLE` | SQL help for a statement |

---

## 5. Create a role (user) and a database for your app

Still as `postgres` (or inside `psql`):

### Option A — shell commands

```bash
sudo -u postgres createuser --interactive
# enter role name, e.g. nestuser
# superuser? → n (for learning, y is ok on local only)

sudo -u postgres createdb notes_app -O nestuser
```

### Option B — SQL inside `psql`

```bash
sudo -u postgres psql
```

```sql
CREATE USER nestuser WITH PASSWORD 'strongpassword';
CREATE DATABASE notes_app OWNER nestuser;
GRANT ALL PRIVILEGES ON DATABASE notes_app TO nestuser;
```

For local learning on WSL, a simple password is fine. **Never commit real passwords** to git.

### Connect as your app user

```bash
psql -h localhost -U nestuser -d notes_app
```

If it asks for a password and auth fails, see [Section 12: peer vs md5/scram](#12-authentication-on-wsl-peer-vs-password).

---

## 6. Connection string (what Nest/Prisma will use)

Format:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Example:

```text
postgresql://nestuser:strongpassword@localhost:5432/notes_app
```

In a Nest project `.env`:

```env
DATABASE_URL="postgresql://nestuser:strongpassword@localhost:5432/notes_app?schema=public"
```

Add `.env` to `.gitignore`.

---

## 7. Tables: the basics

A table defines columns and constraints.

### Create a simple table

```sql
CREATE TABLE notes (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

What each part means:

| Piece | Meaning |
|-------|---------|
| `SERIAL` | Auto-increment integer (`1, 2, 3…`) |
| `PRIMARY KEY` | Unique identity of each row |
| `VARCHAR(200)` | Short string with max length |
| `TEXT` | Unlimited-ish text |
| `NOT NULL` | Required value |
| `DEFAULT NOW()` | Fill automatically if omitted |
| `TIMESTAMPTZ` | Timestamp with time zone (recommended) |

### Inspect the table

```sql
\d notes
```

### Insert / read / update / delete

```sql
INSERT INTO notes (title, content)
VALUES ('Learn Nest', 'Controllers and services');

SELECT * FROM notes;

SELECT id, title FROM notes WHERE id = 1;

UPDATE notes
SET content = 'Updated content'
WHERE id = 1;

DELETE FROM notes WHERE id = 1;
```

### Change a table later (migrations mindset)

```sql
ALTER TABLE notes ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notes RENAME COLUMN content TO body;
ALTER TABLE notes DROP COLUMN is_pinned;
```

In real Nest apps, prefer **migrations** (Prisma Migrate / TypeORM migrations) over random manual `ALTER` in production. Manual SQL is great for learning.

### Drop a table

```sql
DROP TABLE notes;
-- or safely:
DROP TABLE IF EXISTS notes;
```

---

## 8. Keys and constraints (rules for clean data)

| Constraint | Purpose |
|------------|---------|
| `PRIMARY KEY` | Uniquely identifies a row |
| `FOREIGN KEY` | Points to a row in another table |
| `UNIQUE` | No duplicates in that column/set |
| `NOT NULL` | Value required |
| `CHECK` | Custom rule (`price >= 0`) |
| `DEFAULT` | Value when none provided |

Example:

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 9. Relations between tables

Relations answer: *“How do these records connect?”*

PostgreSQL expresses relations with **foreign keys**.

### 9.1 One-to-Many (most common)

One **user** has many **notes**.  
Each note belongs to one user.

```
users (1) ──────< notes (many)
```

```sql
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name  VARCHAR(120) NOT NULL
);

CREATE TABLE notes (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  content    TEXT NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
```

Important parts:

- `user_id … REFERENCES users(id)` → foreign key
- `ON DELETE CASCADE` → if user is deleted, their notes are deleted too
- Index on `user_id` → faster lookups by user

Insert related data:

```sql
INSERT INTO users (email, name)
VALUES ('ahmed@example.com', 'Ahmed')
RETURNING id;

-- suppose returned id = 1
INSERT INTO notes (title, content, user_id)
VALUES ('My first note', 'Hello DB', 1);
```

Join query (read notes with author):

```sql
SELECT
  notes.id,
  notes.title,
  users.name AS author
FROM notes
JOIN users ON users.id = notes.user_id;
```

---

### 9.2 One-to-One

One **user** has one **profile**.

```
users (1) ────── (1) profiles
```

```sql
CREATE TABLE profiles (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio        TEXT,
  avatar_url TEXT
);
```

`UNIQUE` on `user_id` enforces **at most one** profile per user.

---

### 9.3 Many-to-Many

One **note** can have many **tags**, and one **tag** can belong to many **notes**.

You need a **join table** (also called pivot table):

```
notes (many) ──────< note_tags >────── (many) tags
```

```sql
CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

Attach tags:

```sql
INSERT INTO tags (name) VALUES ('nestjs'), ('postgres');

INSERT INTO note_tags (note_id, tag_id) VALUES (1, 1), (1, 2);
```

Query notes with tags:

```sql
SELECT
  notes.title,
  tags.name AS tag
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE notes.id = 1;
```

---

## 10. Relation decision cheat sheet

| Real-world sentence | Relation | How to model |
|---------------------|----------|--------------|
| A user has many notes | One-to-Many | FK on the “many” side (`notes.user_id`) |
| A note belongs to one user | Many-to-One | Same as above (other direction) |
| A user has one profile | One-to-One | FK + `UNIQUE` |
| Notes have many tags / tags on many notes | Many-to-Many | Join table |

**Rule of thumb:**

- Put the foreign key on the **child / dependent** table for 1:N  
- Use a **join table** for N:N  
- Add `UNIQUE` on the FK for 1:1  

---

## 11. Referential actions (`ON DELETE` / `ON UPDATE`)

When a parent row changes, what happens to children?

| Action | Meaning |
|--------|---------|
| `CASCADE` | Also delete/update children |
| `RESTRICT` / `NO ACTION` | Block parent delete if children exist |
| `SET NULL` | Set FK to `NULL` (column must allow null) |
| `SET DEFAULT` | Set FK to its default |

Examples:

```sql
-- deleting a user deletes their notes
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE

-- deleting a user is blocked while notes still exist
user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT
```

Choose deliberately. For learning notes owned by users, `CASCADE` is common.

---

## 12. Authentication on WSL (peer vs password)

If this fails:

```bash
psql -h localhost -U nestuser -d notes_app
```

you may be hitting auth config.

PostgreSQL auth lives in `pg_hba.conf` (path varies by version):

```bash
sudo ls /etc/postgresql/*/main/pg_hba.conf
```

Common local lines:

```text
# OS user postgres connecting locally via socket
local   all   postgres   peer

# password auth over TCP (localhost)
host    all   all   127.0.0.1/32   scram-sha-256
host    all   all   ::1/128        scram-sha-256
```

After edits:

```bash
sudo service postgresql reload
```

Notes:

- `peer` = Linux username must match DB role (common for `sudo -u postgres psql`)
- `-h localhost` forces TCP and usually **password** auth
- Nest/Prisma should use `localhost` + password URL

Set/reset a role password:

```sql
ALTER USER nestuser WITH PASSWORD 'strongpassword';
```

---

## 13. Useful day-to-day management commands

### Backup one database

```bash
pg_dump -h localhost -U nestuser -d notes_app -F c -f notes_app.dump
```

### Restore

```bash
pg_restore -h localhost -U nestuser -d notes_app --clean notes_app.dump
```

Plain SQL dump:

```bash
pg_dump -h localhost -U nestuser -d notes_app > notes_app.sql
psql -h localhost -U nestuser -d notes_app < notes_app.sql
```

### List databases / size

```sql
\l
SELECT pg_size_pretty(pg_database_size('notes_app'));
```

### Kill idle connections (sometimes useful in WSL)

```sql
SELECT pid, usename, state, query
FROM pg_stat_activity
WHERE datname = 'notes_app';
```

---

## 14. Practice lab (do this once)

Run PostgreSQL, then execute this script in `notes_app`:

```sql
DROP TABLE IF EXISTS note_tags;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name  VARCHAR(120) NOT NULL
);

CREATE TABLE profiles (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio     TEXT
);

CREATE TABLE notes (
  id      SERIAL PRIMARY KEY,
  title   VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

INSERT INTO users (email, name) VALUES ('ahmed@example.com', 'Ahmed') RETURNING id;
INSERT INTO profiles (user_id, bio) VALUES (1, 'Learning Nest + Postgres');
INSERT INTO notes (title, content, user_id) VALUES
  ('Nest Controllers', 'Keep them thin', 1),
  ('Postgres FKs', 'Relations use foreign keys', 1);
INSERT INTO tags (name) VALUES ('nestjs'), ('sql');
INSERT INTO note_tags (note_id, tag_id) VALUES (1, 1), (2, 2), (2, 1);

-- verify joins
SELECT u.name, n.title, t.name AS tag
FROM users u
JOIN notes n ON n.user_id = u.id
LEFT JOIN note_tags nt ON nt.note_id = n.id
LEFT JOIN tags t ON t.id = nt.tag_id
ORDER BY n.id, t.name;
```

If that query returns rows with user, note titles, and tags, you understand enough relational modeling to use Prisma/TypeORM confidently.

---

## 15. From raw SQL to Nest

Same relations in Prisma-style thinking:

```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  name    String
  profile Profile?
  notes   Note[]
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  userId Int    @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Note {
  id      Int        @id @default(autoincrement())
  title   String
  content String
  userId  Int
  user    User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags    NoteTag[]
}

model Tag {
  id    Int       @id @default(autoincrement())
  name  String    @unique
  notes NoteTag[]
}

model NoteTag {
  noteId Int
  tagId  Int
  note   Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([noteId, tagId])
}
```

You do **not** need Prisma yet to learn tables. Knowing SQL relations first makes ORM schemas obvious.

---

## 16. Beginner checklist

- [ ] PostgreSQL installed on WSL  
- [ ] I can `sudo service postgresql start` and `pg_isready` succeeds  
- [ ] I can enter `psql` and use `\l`, `\dt`, `\d`  
- [ ] I created a user + database for my app  
- [ ] I created a table with `PRIMARY KEY`  
- [ ] I modeled a **one-to-many** with `REFERENCES`  
- [ ] I modeled a **many-to-many** with a join table  
- [ ] I can `SELECT` with `JOIN`  
- [ ] I have a `DATABASE_URL` ready for Nest  

---

## 17. Common WSL problems

| Problem | Likely fix |
|---------|------------|
| `connection refused` on `5432` | `sudo service postgresql start` |
| `password authentication failed` | Reset password; check `pg_hba.conf`; use `-h localhost` |
| `peer authentication failed` | Connect with matching OS user, or use password + host |
| Service dies after WSL restart | Start service again; consider a small shell alias |
| Nest can’t connect | Confirm URL user/db/password/port; test with `psql` first |
| Permission denied on tables | Connect to correct DB; check table owner/`GRANT`s |

Grant example after creating tables as another role:

```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nestuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nestuser;
```

---

## 18. Safe local habits

1. Use a **dedicated database per project** (`notes_app`, not your personal everything DB).  
2. Keep credentials in `.env`, never in git.  
3. Practice `ON DELETE` choices before enabling cascade in real apps.  
4. Prefer migrations once you start Nest — treat raw SQL as learning and emergency tooling.  
5. Take a dump before big experiments: `pg_dump …`.

---

## Quick command sheet

```bash
sudo service postgresql start
sudo -u postgres psql
psql -h localhost -U nestuser -d notes_app
pg_isready
pg_dump -h localhost -U nestuser -d notes_app > backup.sql
```

```sql
\l
\c notes_app
\dt
\d notes
SELECT * FROM notes;
```

When you can create users/notes/tags with foreign keys and join them, you are ready to plug PostgreSQL into Nest.
