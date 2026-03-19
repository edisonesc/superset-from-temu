# Epic Prompt Set — Superset DIY Next.js App

---

# Run these in order inside Claude Code. Complete each phase fully before moving to the next.

# Between each prompt: run migrations if schema changed, test, update CLAUDE.md checklist.

# ── Confirmed Package Versions (from package.json) ──────────────────────────

# next: 16.1.7

# react: 19.2.3

# react-dom: 19.2.3

# next-auth: ^5.0.0-beta.30

# @auth/core: ^0.34.3

# drizzle-orm: ^0.45.1

# drizzle-kit: ^0.31.10

# mysql2: ^3.20.0

# pg: ^8.20.0

# ioredis: ^5.10.0

# zod: ^4.3.6

# zustand: ^5.0.12

# bcryptjs: ^3.0.3 / @types/bcryptjs: ^2.4.6

# @paralleldrive/cuid2: ^3.3.0

# @tanstack/react-query: ^5.90.21

# @tanstack/react-table: ^8.21.3

# @codemirror/lang-sql: ^6.10.0

# @codemirror/state: ^6.6.0

# @codemirror/view: ^6.40.0

# echarts: ^6.0.0

# echarts-for-react: ^3.0.6

# @dnd-kit/core: ^6.3.1

# @dnd-kit/sortable: ^10.0.0

# @dnd-kit/utilities: ^3.2.2

# sql-formatter: ^15.7.2

# tailwindcss: ^4

# typescript: ^5

# eslint: ^9 / eslint-config-next: 16.1.7

# dotenv-cli: ^11.0.0

# ALL packages are already installed — do NOT add npm install steps between prompts

# ─────────────────────────────────────────────────────────────────────────────

---

### After finishing a task

1. npm run dev — full end to end test:
   a. Register a user
   b. Create a database connection and test it
   c. Create a dataset from a table
   d. Build a chart from the dataset
   e. Create a dashboard and add the chart
   f. Add a filter and verify cross-filtering
   g. Publish the dashboard and verify public URL works
2. npm run lint — fix all warnings
3. npm run build — fix issues if there's any
4. Update CLAUDE.md — mark all items complete
