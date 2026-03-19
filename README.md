# Superset from Temu

<!-- <img width="959" height="413" alt="image" src="https://github.com/user-attachments/assets/59be4aa8-4630-4c25-b1ff-ff50a849d9b3" />
<img width="1834" height="1991" alt="image" src="https://github.com/user-attachments/assets/7c1c395a-bcf3-4b13-9a56-f3690a858f04" />
<img width="1546" height="301" alt="image" src="https://github.com/user-attachments/assets/06e86f76-fc8d-4386-a22a-05b9722aaba6" />
<img width="1808" height="529" alt="image" src="https://github.com/user-attachments/assets/61fa62a7-7650-4966-a515-a63750da9611" /> -->

<!-- This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). -->

<img width="3016" height="787" alt="image" src="https://github.com/user-attachments/assets/0edb032e-da62-4226-98f2-39b5c9ec6a97" />
<img width="2718" height="1911" alt="image" src="https://github.com/user-attachments/assets/1460b84b-0e03-4b55-b3d7-1af2d1ddcb3a" />

<img width="2083" height="429" alt="image" src="https://github.com/user-attachments/assets/3e2f01cc-20c0-462c-8c92-dcb010bc4833" />
<img width="3016" height="763" alt="image" src="https://github.com/user-attachments/assets/767e97bb-fbcb-461c-ad2b-2e81591a0660" />
<img width="2728" height="355" alt="image" src="https://github.com/user-attachments/assets/6cf3297f-6f3b-48cd-86f6-eeaf12be5d5f" />
<img width="2727" height="352" alt="image" src="https://github.com/user-attachments/assets/9d8f75e4-d94a-491f-91cc-3697fac732a5" />
<img width="873" height="969" alt="image" src="https://github.com/user-attachments/assets/83bfe9d7-5208-4aea-8803-f445ac538f2d" />

For codebase, see [ONBOARDING.md](ONBOARDING.md).

## Prerequisites & Setup

### 1. System Requirements

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (for MySQL and Redis)
- `openssl` (for generating secrets — available on macOS/Linux by default)

---

### 2. Start Infrastructure

```bash
# MySQL — metadata database (users, connections, charts, dashboards, etc.)
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=superset_meta \
  -p 3306:3306 \
  mysql:8

# Redis — query result cache and schema cache
docker run -d --name redis \
  -p 6379:6379 \
  redis:7
```

### 3. Install Dependencies

`npm install`

### 4. Configure Environment

`cp .env.example .env.local`

```
NEXTAUTH_SECRET=        # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=mysql://root:secret@127.0.0.1:3306/superset_meta
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=         # openssl rand -hex 32 for DB
```

Generate the two secrets:

```
openssl rand -base64 32   # → paste into NEXTAUTH_SECRET
openssl rand -hex 32      # → paste into ENCRYPTION_KEY
```

### 5. Migrations

```
npx dotenv -e .env.local -- npx drizzle-kit generate
npx dotenv -e .env.local -- npx drizzle-kit migrate
npx dotenv -e .env.local -- npx tsx db/seeds/seed-connection.ts
```

generate: creates the migration SQL files from the schema.
migrate: applies them to your database.
seed: add and promote 1 admin user

### 6. Run

`npm run dev`

### 7. Create Your First User (if not using seed)

```
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword","name":"Admin"}'
```

New users default to the gamma role. Manually update the role to admin in MySQL if needed:

`UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';`

---

# Roles

4 roles defined: admin, alpha, gamma, public (new users default to gamma)

API enforcement is consistent across all mutation endpoints:

admin only: user management (/api/admin/users)
admin + alpha: create/edit/delete connections, datasets, charts, dashboards
all authenticated: read everything, run SQL queries, manage own saved queries
no auth: published dashboards + their chart data (/api/public/\*)

---

## Technologies

### Core Framework

| Technology                                    | Version | Purpose                                                                |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| [Next.js](https://nextjs.org/)                | 16      | Full-stack React framework — App Router, API routes, server components |
| [React](https://react.dev/)                   | 19      | UI component library                                                   |
| [TypeScript](https://www.typescriptlang.org/) | 5       | Static typing across the entire codebase                               |
| [Tailwind CSS](https://tailwindcss.com/)      | 4       | Utility-first CSS framework                                            |

### Authentication & Security

| Technology                                       | Version  | Purpose                                                |
| ------------------------------------------------ | -------- | ------------------------------------------------------ |
| [NextAuth.js](https://authjs.dev/)               | v5 beta  | Session management, Credentials provider, JWT strategy |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3        | Password hashing (12 rounds)                           |
| Node.js `crypto`                                 | built-in | AES-256-GCM encryption for stored database passwords   |

### Database & ORM

| Technology                                                | Version | Purpose                                                            |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| [Drizzle ORM](https://orm.drizzle.team/)                  | 0.45    | Type-safe ORM for the metadata database                            |
| [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) | 0.31    | Schema migrations and introspection CLI                            |
| [mysql2](https://github.com/sidorares/node-mysql2)        | 3       | MySQL driver — used for both the metadata DB and user data sources |
| [pg](https://node-postgres.com/)                          | 8       | PostgreSQL driver — for connecting to user PostgreSQL data sources |

### Caching

| Technology                                  | Version | Purpose                                                                   |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| [ioredis](https://github.com/redis/ioredis) | 5       | Redis client — caches query results, schema introspection, and chart data |

### State Management & Data Fetching

| Technology                                   | Version | Purpose                                                   |
| -------------------------------------------- | ------- | --------------------------------------------------------- |
| [Zustand](https://zustand-demo.pmnd.rs/)     | 5       | Client-side state for SQL Lab tabs and Dashboard editor   |
| [TanStack Query](https://tanstack.com/query) | 5       | Server state, data fetching, and cache invalidation in UI |

### SQL Editor

| Technology                                                          | Version | Purpose                                                                                 |
| ------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| [CodeMirror 6](https://codemirror.net/)                             | 6       | Embedded code editor with SQL syntax highlighting, line numbers, and keyboard shortcuts |
| [sql-formatter](https://github.com/sql-formatter-org/sql-formatter) | 15      | Auto-format SQL queries in the editor                                                   |

### Data Visualization

| Technology                                                       | Version | Purpose                                                   |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| [Apache ECharts](https://echarts.apache.org/)                    | 6       | Charting engine powering all 10 chart types               |
| [echarts-for-react](https://github.com/hustcc/echarts-for-react) | 3       | React wrapper for ECharts                                 |
| [TanStack Table](https://tanstack.com/table)                     | 8       | Sortable, paginated data table and pivot table components |

### Dashboard

| Technology                     | Version | Purpose                                             |
| ------------------------------ | ------- | --------------------------------------------------- |
| [dnd kit](https://dndkit.com/) | 6/10    | Drag-and-drop grid for rearranging dashboard panels |

### Validation & Utilities

| Technology                                                     | Version | Purpose                                                  |
| -------------------------------------------------------------- | ------- | -------------------------------------------------------- |
| [Zod](https://zod.dev/)                                        | 4       | Runtime schema validation on all API request bodies      |
| [@paralleldrive/cuid2](https://github.com/paralleldrive/cuid2) | 3       | Collision-resistant unique ID generation for all records |
| [Sonner](https://sonner.emilkowal.ski/)                        | latest  | Toast notification system                                |
