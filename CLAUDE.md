# Epic Prompt Set — Superset DIY Next.js App

## Phase 1 Checklist — Foundation, Schema & Auth ✅

- [x] `db/schema.ts` — full metadata schema (users, database_connections, datasets, charts, dashboards, dashboard_charts, saved_queries, query_history)
- [x] `db/index.ts` — Drizzle client singleton (mysql2 pool)
- [x] `lib/redis.ts` — ioredis singleton + typed `cache` helper
- [x] `lib/crypto.ts` — AES-256-GCM `encryptPassword` / `decryptPassword`
- [x] `lib/constants.ts` — USER_ROLES, QUERY_CACHE_TTL_SECONDS, MAX_QUERY_ROWS, SUPPORTED_DIALECTS, DEFAULT_PAGE_SIZE
- [x] `types/index.ts` — ApiResponse, PaginatedResponse, UserRole, DatabaseDialect, ChartVizType
- [x] `lib/auth.ts` — NextAuth v5 beta, Credentials provider, JWT strategy, role in session
- [x] `app/api/auth/[...nextauth]/route.ts` — GET/POST handlers
- [x] `middleware.ts` — protects /api/* and all dashboard routes, redirects to /login
- [x] `app/globals.css` — Tailwind v4 @import, dark mode CSS variables
- [x] `app/layout.tsx` — root layout with dark class and SessionProvider
- [x] `app/(auth)/login/page.tsx` — email/password login form
- [x] `app/(dashboard)/layout.tsx` — sidebar with Dashboards, Charts, SQL Lab, Datasets, Connections
- [x] `app/(dashboard)/page.tsx` — overview/home page
- [x] `app/api/auth/register/route.ts` — POST registration with Zod validation + bcrypt

### Next steps before Phase 2
1. `cp .env.example .env.local` and fill in values
2. Add ENCRYPTION_KEY: `openssl rand -hex 32`
3. Add NEXTAUTH_SECRET: `openssl rand -base64 32`
4. `npx dotenv -e .env.local -- npx drizzle-kit generate`
5. `npx dotenv -e .env.local -- npx drizzle-kit migrate`
6. `npm run dev` — verify `/login` renders and login works

---

## Phase 2 Checklist — SQL Lab ✅

- [x] `lib/query-runner.ts` — runQuery (mysql2 + pg, LIMIT enforcement, Redis cache, history logging), testConnection
- [x] `app/api/connections/route.ts` — GET list, POST create (test-before-save, encrypt password)
- [x] `app/api/connections/[id]/route.ts` — GET, PUT, DELETE
- [x] `app/api/connections/[id]/test/route.ts` — POST test existing connection
- [x] `app/api/connections/[id]/schema/route.ts` — GET schema browser (tables + columns, Redis cached 60s)
- [x] `app/api/query/route.ts` — POST execute SQL
- [x] `app/api/saved-queries/route.ts` — GET list, POST create
- [x] `app/api/saved-queries/[id]/route.ts` — PUT update, DELETE (owner-scoped)
- [x] `app/api/query-history/route.ts` — GET paginated history (user-scoped, connectionId filter)
- [x] `stores/sqllab-store.ts` — Zustand v5 store (tabs, sql, connectionId, results, status)
- [x] `components/sqllab/SqlEditor.tsx` — CodeMirror 6 (SQL dialect, dark theme, Ctrl+Enter)
- [x] `components/react-query-provider.tsx` — TanStack Query client provider
- [x] `app/layout.tsx` — added ReactQueryProvider
- [x] `app/(dashboard)/sqllab/page.tsx` — full SQL Lab UI (multi-tab, schema browser, results table, history, save modal)

### After Phase 2
1. `npm run dev` and verify SQL Lab works end to end
2. Test: create a connection, run a SELECT query, verify results table renders

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

## PROMPT 1 — Foundation, Schema & Auth

```
Read CLAUDE.md fully before starting. This is Phase 1 of a 5-phase build.

## Confirmed stack versions — use these exactly, do not assume or substitute:
- next: 16.1.7
- react: 19.2.3 / react-dom: 19.2.3
- next-auth: 5.0.0-beta.30 with @auth/core: 0.34.3
- drizzle-orm: 0.45.1 / drizzle-kit: 0.31.10
- mysql2: 3.20.0
- zod: 4.3.6 — use zod v4 API (z.object, z.string, etc. — no breaking changes from v3 but confirm imports)
- zustand: 5.0.12 — use the zustand v5 API (create, useStore)
- bcryptjs: 3.0.3
- @paralleldrive/cuid2: 3.3.0
- tailwindcss: 4 — use Tailwind v4 syntax (@import "tailwindcss" in CSS, no tailwind.config.js needed)
- typescript: 5
- All packages are already installed. Do not suggest npm install commands.

### Goal
Establish the complete foundation: full metadata database schema, Drizzle client,
Redis client, encryption utility, NextAuth.js v5 with RBAC, and the base app layout.
Everything built in this phase is depended on by all future phases — make it bulletproof.

### 1. Full Metadata Schema — db/schema.ts
Replace the existing users table and define the complete schema for all entities.
Every table must have: id (cuid2 string primary key), created_at, updated_at timestamps.
Use drizzle-orm/mysql-core throughout. Define and export all tables:

users:
  - id, email (unique), name, password_hash, role (enum: admin | alpha | gamma | public), created_at, updated_at

database_connections:
  - id, name, description, dialect (enum: mysql | postgresql), host, port, database_name,
    username, encrypted_password, created_by (fk users), created_at, updated_at

datasets:
  - id, name, description, connection_id (fk database_connections), table_name,
    sql_definition (nullable — for virtual datasets), column_metadata (json),
    created_by (fk users), created_at, updated_at

charts:
  - id, name, description, viz_type, dataset_id (fk datasets), config (json),
    query_context (json), created_by (fk users), created_at, updated_at

dashboards:
  - id, name, description, slug (unique), layout (json), filter_config (json),
    is_published (boolean default false), created_by (fk users), created_at, updated_at

dashboard_charts:
  - id, dashboard_id (fk dashboards), chart_id (fk charts), position (json)

saved_queries:
  - id, name, description, sql, connection_id (fk database_connections),
    created_by (fk users), created_at, updated_at

query_history:
  - id, sql, connection_id (fk database_connections), executed_by (fk users),
    status (enum: success | error), row_count (nullable), duration_ms (nullable),
    error_message (nullable), created_at

Export a single db instance from db/index.ts using drizzle-orm and mysql2.
Export all table references from db/schema.ts as named exports.
Export all inferred types (e.g. type User = typeof users.$inferSelect).

### 2. Drizzle Client — db/index.ts
Create the singleton Drizzle client using mysql2 pool.
Use drizzle-orm 0.45.1 API — import from 'drizzle-orm/mysql2'.
Read DATABASE_URL from process.env. Throw a clear error if it is missing.
Document with JSDoc.

### 3. Redis Client — lib/redis.ts
Create a singleton ioredis client using ioredis 5.10.0.
Read REDIS_URL from process.env. Throw a clear error if it is missing.
Export a typed helper: cache.get<T>, cache.set<T>(key, value, ttlSeconds), cache.del.
Document with JSDoc.

### 4. Encryption Utility — lib/crypto.ts
Implement AES-256-GCM encrypt and decrypt functions using Node.js built-in crypto module.
Read ENCRYPTION_KEY from process.env.
Used exclusively for storing database_connection passwords.
Export: encryptPassword(plain: string): string, decryptPassword(cipher: string): string.
Document with JSDoc.

### 5. Constants — lib/constants.ts
Define and export all app-wide constants:
  - USER_ROLES with all role values
  - QUERY_CACHE_TTL_SECONDS = 300
  - MAX_QUERY_ROWS = 10000
  - SUPPORTED_DIALECTS
  - DEFAULT_PAGE_SIZE = 25
Document with JSDoc.

### 6. Shared Types — types/index.ts
Define and export all shared TypeScript types used across the app:
  - ApiResponse<T> — the standard { data: T, error: null } | { data: null, error: string } shape
  - PaginatedResponse<T>
  - UserRole
  - DatabaseDialect
  - ChartVizType (union of all supported viz type slugs)
  - Any other types shared across features
Document with JSDoc.

### 7. NextAuth.js v5 — lib/auth.ts + app/api/auth/[...nextauth]/route.ts
Use next-auth 5.0.0-beta.30 with @auth/core 0.34.3.
Use the next-auth v5 beta API — import from 'next-auth' and configure with NextAuth().
Configure with:
  - Credentials provider (email + password, bcrypt comparison against password_hash)
  - JWT session strategy
  - Session includes: user id, email, name, role
  - Role typed as UserRole from types/index.ts
  - Callbacks to attach role to session and JWT
Read NEXTAUTH_SECRET from process.env.
Document with JSDoc.

### 8. Auth API Route — app/api/auth/[...nextauth]/route.ts
Wire up the NextAuth handler using next-auth v5 beta pattern.
Export GET and POST handlers.

### 9. Auth Middleware — middleware.ts (project root)
Protect all routes under /dashboard/* and /api/* (except /api/auth/*).
Redirect unauthenticated requests to /login.
Use next-auth v5 beta auth() helper.

### 10. Base Layout & Pages
Use Tailwind v4 — import via @import "tailwindcss" in globals.css, no tailwind.config.js.
Create the following with full Tailwind dark-mode styling (dark background, clean sidebar):

app/layout.tsx — root layout, sets dark mode class, wraps in SessionProvider
app/globals.css — @import "tailwindcss" at top, dark mode CSS variables
app/(auth)/login/page.tsx — login form, email + password, calls NextAuth signIn, shows errors
app/(dashboard)/layout.tsx — protected layout with sidebar navigation
  Sidebar links: Dashboards, Charts, SQL Lab, Datasets, Connections
  Show current user name and role in sidebar footer
  Logout button
app/(dashboard)/page.tsx — simple home/overview page placeholder

### 11. Registration API — app/api/auth/register/route.ts
POST endpoint to create a new user.
Validate body with Zod v4: z.object({ email: z.string().email(), password: z.string().min(8), name: z.string() }).
Hash password with bcryptjs (rounds: 12).
Insert into users table with role: gamma by default.
Use createId() from @paralleldrive/cuid2 for id generation.
Return ApiResponse<{ id: string }>.

### Output contract for next phase
After this phase the following must be importable and working:
- db from db/index.ts
- cache from lib/redis.ts
- encryptPassword, decryptPassword from lib/crypto.ts
- USER_ROLES, QUERY_CACHE_TTL_SECONDS, MAX_QUERY_ROWS from lib/constants.ts
- ApiResponse, UserRole, DatabaseDialect from types/index.ts
- auth, signIn, signOut from lib/auth.ts
- All schema tables and inferred types from db/schema.ts

### After running this prompt
1. Add ENCRYPTION_KEY to .env.local (run: openssl rand -hex 16)
2. npx dotenv -e .env.local -- npx drizzle-kit generate
3. npx dotenv -e .env.local -- npx drizzle-kit migrate
4. npm run dev and verify /login renders
5. Update CLAUDE.md checklist
```

---

## PROMPT 2 — SQL Lab

```
Read CLAUDE.md fully before starting. This is Phase 2 of a 5-phase build.
Phase 1 is complete. All items in the CLAUDE.md checklist marked done are available to import.
Do not regenerate or modify anything from Phase 1.

## Confirmed stack versions — use these exactly:
- next: 16.1.7 / react: 19.2.3
- next-auth: 5.0.0-beta.30
- drizzle-orm: 0.45.1 / mysql2: 3.20.0 / pg: 8.20.0
- @codemirror/lang-sql: 6.10.0 / @codemirror/state: 6.6.0 / @codemirror/view: 6.40.0
- @tanstack/react-query: 5.90.21 / @tanstack/react-table: 8.21.3
- zustand: 5.0.12 — use v5 API
- zod: 4.3.6
- sql-formatter: 15.7.2
- ioredis: 5.10.0
- All packages are already installed. Do not suggest npm install commands.

### Goal
Build the full SQL Lab feature: database connection manager, query runner engine,
CodeMirror 6 SQL editor, results table, query history, and saved queries.

### 1. Query Runner Engine — lib/query-runner.ts
This is the core engine for executing user SQL against their data sources.
CRITICAL SECURITY RULES — enforce all of these:
  - Never accept a raw connection string from the client
  - Only accept a connectionId — fetch and decrypt credentials server-side
  - Enforce MAX_QUERY_ROWS limit (from constants.ts) by appending LIMIT if not present
  - Wrap execution in try/catch and return structured errors, never raw DB errors
  - Support both mysql and postgresql dialects dynamically using mysql2 and pg

Export:
/**
 * Executes a SQL query against a stored data source connection.
 * Credentials are fetched from the metadata DB and decrypted server-side.
 * @param connectionId - ID of the stored database_connection record
 * @param sql - Raw SQL string from the user
 * @param userId - ID of the user executing the query (for history logging)
 * @returns Typed result rows and column definitions
 */
runQuery(connectionId, sql, userId): Promise<QueryResult>

/**
 * Tests connectivity to a database connection without executing user SQL.
 * @param connection - Partial connection config (before saving)
 * @returns { success: boolean, message: string }
 */
testConnection(connection: TestConnectionInput): Promise<ConnectionTestResult>

Define and export QueryResult, ColumnDefinition, TestConnectionInput, ConnectionTestResult types.
Log every execution to query_history table (status, duration_ms, row_count, error_message).
Cache results in Redis using cache.set with QUERY_CACHE_TTL_SECONDS. Cache key: hash of connectionId + sql.

### 2. Database Connections API — app/api/connections/route.ts + [id]/route.ts
Full CRUD for database_connections.
GET /api/connections — list all connections (omit encrypted_password from response)
POST /api/connections — create connection, encrypt password before storing, test connectivity first
GET /api/connections/[id] — get single connection (omit password)
PUT /api/connections/[id] — update connection
DELETE /api/connections/[id] — delete connection
POST /api/connections/[id]/test — test existing connection
All routes: require auth session. Validate with Zod v4. Return ApiResponse<T>.
Only admin and alpha roles can create/edit/delete connections.

### 3. Query Execution API — app/api/query/route.ts
POST endpoint.
Body: { connectionId: string, sql: string }
Validate with Zod v4.
Call runQuery from lib/query-runner.ts.
Return ApiResponse<QueryResult>.
Require authenticated session.

### 4. Saved Queries API — app/api/saved-queries/route.ts + [id]/route.ts
Full CRUD for saved_queries.
GET — list saved queries for current user
POST — create saved query
PUT /[id] — update
DELETE /[id] — delete
Validate with Zod v4. Return ApiResponse<T>.

### 5. Query History API — app/api/query-history/route.ts
GET — return paginated query history for current user
Query params: page, pageSize, connectionId (optional filter)
Return PaginatedResponse<QueryHistory>.

### 6. Zustand Store — stores/sqllab-store.ts
Use zustand v5 API (import { create } from 'zustand').
/**
 * SQL Lab editor state store.
 * Manages active query tabs, editor content, execution state, and results.
 */
State:
  - tabs: QueryTab[] — each tab has id, name, sql, connectionId, results, status, error
  - activeTabId: string
Actions:
  - addTab, removeTab, setActiveTab
  - updateTabSql(tabId, sql)
  - setTabConnection(tabId, connectionId)
  - setTabResults(tabId, results)
  - setTabStatus(tabId, status)
Export QueryTab type.

### 7. SQL Lab Page — app/(dashboard)/sqllab/page.tsx
Full SQL Lab UI. Use 'use client'. Layout:
  - Top bar: connection selector dropdown, Run Query button, Save Query button, Format SQL button
    (use sql-formatter 15.7.2 for format — import { format } from 'sql-formatter')
  - Left panel (collapsible): schema browser — lists connections → tables → columns
  - Main panel: CodeMirror 6 editor (SQL dialect, dark theme, line numbers, autocomplete)
  - Bottom panel: tabbed results area — Results tab + History tab

CodeMirror 6 setup using @codemirror/lang-sql 6.10.0, @codemirror/view 6.40.0, @codemirror/state 6.6.0:
  - SQL dialect with keyword completion
  - Dark theme matching app
  - Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run query

Results table using @tanstack/react-table 8.21.3:
  - Virtualized for large result sets
  - Column headers show inferred type
  - Row count + execution time displayed above table
  - Export to CSV button

History tab:
  - List of recent queries for current user
  - Click to restore SQL to editor
  - Shows status (success/error), duration, row count, timestamp

Schema Browser:
  - Fetch connections list on mount
  - On connection select: fetch tables via GET /api/connections/[id]/schema (implement this route)
  - Expandable tree: connection → tables → columns with type badges
  - Click table name to insert into editor

### 8. Multi-tab support
SQL Lab supports multiple query tabs.
Each tab is independent: own SQL, own connection, own results.
Managed via sqllab-store.ts (zustand v5).
Add tab, close tab, rename tab (double-click).

### Output contract for next phase
After this phase:
- GET /api/connections returns connection list
- POST /api/query executes SQL and returns results
- /sqllab page renders editor, runs queries, shows results

### After running this prompt
1. npm run dev and verify SQL Lab works end to end
2. Test: create a connection, run a SELECT query, verify results table renders
3. Update CLAUDE.md checklist
```

---

## PROMPT 3 — Chart System

```
Read CLAUDE.md fully before starting. This is Phase 3 of a 5-phase build.
Phase 1 and Phase 2 are complete. All items marked done in CLAUDE.md are available to import.
Do not regenerate or modify anything from previous phases.

## Confirmed stack versions — use these exactly:
- next: 16.1.7 / react: 19.2.3
- echarts: 6.0.0 / echarts-for-react: 3.0.6
- @tanstack/react-query: 5.90.21 / @tanstack/react-table: 8.21.3
- zustand: 5.0.12 — use v5 API
- zod: 4.3.6
- drizzle-orm: 0.45.1
- All packages are already installed. Do not suggest npm install commands.

### Goal
Build the complete chart system: registry pattern, 10 core chart types, chart builder UI,
chart data query layer, and chart explorer page.

### 1. Chart Registry — components/charts/registry.ts
This is the heart of the chart system. Define the registry as a map of vizType slug to ChartDefinition.

/**
 * Defines the contract every chart type must implement to be registered.
 */
type ChartDefinition = {
  vizType: ChartVizType
  label: string
  description: string
  icon: string                    // lucide-react icon name
  configSchema: ChartConfigSchema
  component: React.ComponentType<ChartComponentProps>
  transformer: ChartTransformer
  defaultConfig: Partial<ChartConfig>
}

Export:
  - chartRegistry: Record<ChartVizType, ChartDefinition>
  - getChart(vizType: ChartVizType): ChartDefinition
  - listCharts(): ChartDefinition[]

### 2. Shared Chart Types — types/index.ts (extend existing)
Add to existing types/index.ts — do not replace existing types:
  - ChartComponentProps — normalized data + config + optional onCrossFilter callback
  - ChartConfig — the JSON stored in the charts table
  - ChartConfigSchema — describes what columns/metrics a chart type requires
  - ChartTransformer — (rows: Row[], config: ChartConfig) => ChartComponentProps
  - Row — Record<string, unknown>

### 3. Implement 10 Core Chart Types
For each chart type create components/charts/[vizType].tsx.
Each file exports: the React component, transformer function, config schema, default config.
Register all in registry.ts.

Use echarts 6.0.0 via echarts-for-react 3.0.6 for all chart types:

1. bar — vertical and horizontal bar. Config: x_axis, metrics[], orientation.
2. line — line and area chart. Config: x_axis, metrics[], show_area (boolean).
3. pie — pie and donut. Config: dimension, metric, donut (boolean), show_labels.
4. scatter — scatter plot. Config: x_axis, y_axis, bubble_size (optional), color_dimension (optional).
5. area — stacked area. Config: x_axis, metrics[], stacked (boolean).
6. heatmap — heatmap grid. Config: x_axis, y_axis, metric.
7. big_number — single KPI with trend indicator. Config: metric, comparison_metric (optional), suffix, prefix.
8. big_number_total — big number without trend. Config: metric, suffix, prefix.
9. table — data table with sorting/pagination using @tanstack/react-table 8.21.3.
10. pivot_table — pivot table. Config: rows[], columns[], metrics[], aggregation.

All chart components:
  - Accept ChartComponentProps including onCrossFilter?: (dimension: string, value: unknown) => void
  - Are responsive (echarts resize observer)
  - Handle empty/null data with empty state UI
  - Dark-mode styled matching app theme
  - JSDoc on component and transformer

### 4. Chart Data Query Layer — lib/chart-query.ts
/**
 * Translates chart config + dataset into SQL, executes it, and returns
 * transformed data ready for the chart component.
 */
Export:
  buildChartQuery(chart: Chart, dataset: Dataset): string
  fetchChartData(chartId: string, filters?: FilterContext): Promise<ChartComponentProps>

Cache in Redis: key chart:{chartId}:{hash(filters)}, TTL: QUERY_CACHE_TTL_SECONDS.

### 5. Charts API — app/api/charts/route.ts + [id]/route.ts + [id]/data/route.ts
GET /api/charts — list all charts (paginated)
POST /api/charts — create chart, validate config with Zod v4
GET /api/charts/[id] — get chart with dataset info joined
PUT /api/charts/[id] — update chart config
DELETE /api/charts/[id] — delete chart
GET /api/charts/[id]/data — fetch chart data, supports filter query params
All routes: require auth. Return ApiResponse<T>.
Mutations require alpha or admin role.

### 6. Chart Builder — app/(dashboard)/charts/new/page.tsx + components/charts/ChartBuilder.tsx
Full chart builder UI. Use 'use client'. Layout:

Left panel — Data tab:
  - Dataset selector (searchable dropdown)
  - Available columns with type badges
  - Dimension picker
  - Metric picker with aggregation selector (SUM, AVG, COUNT, MIN, MAX)
  - Time range selector (presets + custom range)
  - Filters section

Left panel — Customize tab:
  - Chart-type-specific config options from configSchema
  - Color scheme selector
  - Show/hide legend toggle
  - Title and description inputs

Center — Live preview:
  - Renders selected chart type with current config
  - Auto-refreshes on config change (debounced 500ms)
  - Loading skeleton while fetching
  - Error state if query fails

Top bar:
  - Chart type selector (icon grid of all registered chart types)
  - Save button (POST /api/charts)
  - Chart name input

### 7. Chart List Page — app/(dashboard)/charts/page.tsx
Grid of chart cards: chart name, viz type icon, dataset name, last updated.
Search bar to filter by name.
Click card → /charts/[id].
Create New Chart button → /charts/new.

### 8. Chart Explorer — app/(dashboard)/charts/[id]/page.tsx
View and edit existing chart.
Same layout as Chart Builder but pre-populated.
Edit mode toggle — only alpha/admin can edit.
Share button — copies deep link URL.

### Output contract for next phase
After this phase:
- GET /api/charts/[id]/data returns chart-ready data
- ChartBuilder renders a working chart from a real dataset
- All 10 chart types render correctly

### After running this prompt
1. npm run dev and verify chart builder renders
2. Test: connect a dataset, build a bar chart, verify it renders with real data
3. Update CLAUDE.md checklist
```

---

## PROMPT 4 — Dashboard Engine

```
Read CLAUDE.md fully before starting. This is Phase 4 of a 5-phase build.
Phases 1, 2, and 3 are complete. All items marked done in CLAUDE.md are available to import.
Do not regenerate or modify anything from previous phases.

## Confirmed stack versions — use these exactly:
- next: 16.1.7 / react: 19.2.3
- @dnd-kit/core: 6.3.1 / @dnd-kit/sortable: 10.0.0 / @dnd-kit/utilities: 3.2.2
- zustand: 5.0.12 — use v5 API
- @tanstack/react-query: 5.90.21
- zod: 4.3.6
- next-auth: 5.0.0-beta.30
- All packages are already installed. Do not suggest npm install commands.

### Goal
Build the full dashboard engine: drag-and-drop grid canvas, filter bar with cross-chart
filtering, dashboard CRUD, view/edit modes, and public sharing.

### 1. Dashboard Zustand Store — stores/dashboard-store.ts
Use zustand v5 API (import { create } from 'zustand').
/**
 * Dashboard editor and viewer state.
 * Manages layout, active filters, edit mode, and chart panel states.
 */
State:
  - dashboard: Dashboard | null
  - layout: LayoutItem[]
  - filters: FilterContext
  - isEditMode: boolean
  - isDirty: boolean
  - activePanelId: string | null

Actions:
  - loadDashboard(id: string)
  - setEditMode(enabled: boolean)
  - updateLayout(layout: LayoutItem[])
  - addChart(chartId: string)
  - removePanel(panelId: string)
  - setFilter(filterId: string, value: FilterValue)
  - clearFilter(filterId: string)
  - clearAllFilters()
  - saveDashboard()
  - publishDashboard()

Export LayoutItem, FilterContext, FilterValue types.

### 2. Dashboards API — app/api/dashboards/route.ts + [id]/route.ts
GET /api/dashboards — list dashboards (paginated)
POST /api/dashboards — create dashboard, auto-generate slug from name
GET /api/dashboards/[id] — get dashboard with charts joined
PUT /api/dashboards/[id] — update layout, filter_config, name, is_published
DELETE /api/dashboards/[id] — delete dashboard
GET /api/dashboards/slug/[slug] — get by slug (supports public dashboards, no auth required)
Mutations require alpha or admin role. Return ApiResponse<T>.

### 3. Dashboard Grid Canvas — components/dashboard/DashboardCanvas.tsx
Use @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/utilities 3.2.2.
/**
 * Drag-and-drop grid canvas for arranging chart panels.
 */
12-column CSS grid. Each panel has col span and row span stored in layout.
Edit mode: panels draggable, resizable, deletable. Add Chart button.
View mode: static panels with live chart data.
Chart element clicks trigger cross-filter events.

### 4. Chart Panel — components/dashboard/ChartPanel.tsx
/**
 * Single chart panel within the dashboard canvas.
 * Handles its own data fetching, loading, and error states.
 */
Props: chartId, panelId, isEditMode, filters (FilterContext)
Use @tanstack/react-query 5.90.21 for data fetching.
Fetches from GET /api/charts/[id]/data with active filters as query params.
Loading skeleton, error state with retry.
Renders chart from registry.
Emits cross-filter events on chart element click via onCrossFilter callback.

### 5. Filter Bar — components/dashboard/FilterBar.tsx
/**
 * Global filter bar broadcasting filter values to all charts.
 */
Filter types: value filter, time range filter, numerical range filter.
Filter config stored in dashboard.filter_config JSON.
Active values in dashboard-store filters state (zustand v5).
On filter change: invalidate TanStack Query cache for all chart panels.
Edit mode: Add Filter button, column targeting config.

### 6. Cross-Filter System
On chart element click (bar, pie slice, scatter point):
  - Call dashboard-store setFilter via onCrossFilter callback
  - All ChartPanel components re-fetch with new filter
  - Active cross-filters shown as dismissible chips in filter bar
  - Clear All button resets all cross-filters

### 7. Dashboard Viewer — app/(dashboard)/dashboards/[id]/page.tsx
Loads dashboard via loadDashboard from dashboard-store.
Renders FilterBar + DashboardCanvas.
Edit button (alpha/admin only) → toggles edit mode.
Edit mode: Save button, Discard Changes button, Publish toggle.
Unsaved changes prompt on navigate away (isDirty check).

### 8. Dashboard List — app/(dashboard)/dashboards/page.tsx
Grid of dashboard cards: name, description, chart count, last updated, published badge.
Search and filter by published/draft.
Create New Dashboard button.

### 9. Public Dashboard — app/public/dashboard/[slug]/page.tsx
No auth required.
Loads by slug via GET /api/dashboards/slug/[slug].
Only renders if is_published = true, else 404.
Read-only — no edit mode.
Full chart rendering with live data.

### 10. Embed Mode
?embed=true query param on public dashboard route.
When embed=true: hide all chrome, render canvas only.
Suitable for iFrame embedding.

### Output contract for next phase
After this phase:
- Dashboards can be created, charts added, layout saved
- Filters broadcast to all charts
- Cross-filtering works between charts
- Public sharing via slug works

### After running this prompt
1. npm run dev and verify dashboard canvas renders
2. Test: create a dashboard, add 2 charts, drag to rearrange, save layout
3. Test: add a filter, verify both charts re-fetch with filter applied
4. Update CLAUDE.md checklist
```

---

## PROMPT 5 — Dataset Manager & Final Polish

```
Read CLAUDE.md fully before starting. This is Phase 5 of a 5-phase build.
Phases 1–4 are complete. All items marked done in CLAUDE.md are available to import.
Do not regenerate or modify anything from previous phases.

## Confirmed stack versions — use these exactly:
- next: 16.1.7 / react: 19.2.3
- drizzle-orm: 0.45.1 / mysql2: 3.20.0 / pg: 8.20.0
- @tanstack/react-query: 5.90.21 / @tanstack/react-table: 8.21.3
- zustand: 5.0.12 — use v5 API
- zod: 4.3.6
- @codemirror/lang-sql: 6.10.0 / @codemirror/view: 6.40.0 / @codemirror/state: 6.6.0
- tailwindcss: 4
- All packages are already installed. Do not suggest npm install commands.
- sonner is NOT yet installed — add it: npm install sonner

### Goal
Build the dataset manager, schema browser, connection manager UI, app-wide polish,
and production-readiness hardening.

### 1. Dataset API — app/api/datasets/route.ts + [id]/route.ts + [id]/columns/route.ts
GET /api/datasets — list all datasets (paginated, searchable)
POST /api/datasets — create dataset (physical or virtual/SQL-defined)
GET /api/datasets/[id] — get dataset with connection info joined
PUT /api/datasets/[id] — update dataset
DELETE /api/datasets/[id] — delete (return 409 if charts depend on it)
GET /api/datasets/[id]/columns — column list from live DB introspection
All routes: require auth. Mutations require alpha or admin. Return ApiResponse<T>.

### 2. Schema Introspection — lib/schema-introspector.ts
/**
 * Introspects a live database to discover tables and column metadata.
 * Supports MySQL (INFORMATION_SCHEMA) and PostgreSQL (pg_catalog).
 */
Export:
  getTables(connectionId: string): Promise<TableInfo[]>
  getColumns(connectionId: string, tableName: string): Promise<ColumnInfo[]>
  getRowCount(connectionId: string, tableName: string): Promise<number>

TableInfo: { name, schema, rowCount }
ColumnInfo: { name, dataType, nullable, isPrimaryKey, isForeignKey }
Cache in Redis: schema:{connectionId}:{tableName}, TTL: 60 seconds.

### 3. Dataset Manager — app/(dashboard)/datasets/page.tsx
List: name, type (physical/virtual), connection name, chart count, last updated.
Search bar. Create Dataset button. Click row → dataset detail page.

### 4. Dataset Detail — app/(dashboard)/datasets/[id]/page.tsx
Two tabs:

Overview tab:
  - Name, description (editable inline for alpha/admin)
  - Connection info
  - For physical: table name. For virtual: CodeMirror SQL editor (read-only for gamma)
  - Charts using this dataset (list with links)

Columns tab:
  - Table: name, data type, label (editable), description (editable),
    is_temporal toggle, is_filterable toggle, is_groupable toggle
  - Sync Columns button — re-introspects and updates column_metadata
  - Save Changes button

### 5. Connection Manager UI — app/(dashboard)/connections/page.tsx + new/page.tsx + [id]/page.tsx
List: name, dialect badge, host, database, created by, test status.
Test Connection button per row.
Create/Edit form:
  - Name, description, dialect selector (MySQL/PostgreSQL — changes port default dynamically)
  - Host, port, database name, username, password (masked, show/hide toggle)
  - Test Connection button (inline, before saving)
  - Save only enabled after successful test
  - Password never returned from API

### 6. User Management — app/(dashboard)/admin/users/page.tsx
Admin-only (redirect non-admin to 404).
Table: email, name, role, created at.
Edit role dropdown per user.
PUT /api/admin/users/[id]/role — admin only.

### 7. Toast Notifications
Install and configure sonner for toast notifications.
Add success/error toasts on all mutations:
  - Save chart, save dashboard, run query, create connection, create dataset
Import and use Toaster in app/layout.tsx.

### 8. App-wide Polish
Navigation: active route highlighted in sidebar, breadcrumbs on inner pages.
Empty states: all list pages have illustrated empty states with CTA.
Loading states: loading.tsx skeletons on all data-fetching pages matching content shape.
Keyboard shortcuts:
  - Ctrl+S / Cmd+S — save in chart builder and dashboard editor
  - Escape — close modals

### 9. Error Hardening
Audit all API routes:
  - Every route has try/catch
  - No raw DB errors reach client
  - Zod v4 validation errors return 400 with readable messages
  - Auth errors return 401, permission errors return 403

Audit all client components:
  - Every data-fetching component has error state UI
  - Every mutation has error handling with sonner toast

### 10. Performance
  - All list pages paginated using DEFAULT_PAGE_SIZE from constants.ts
  - Dashboard chart panels load in parallel (Promise.all)
  - SQL Lab results table virtualized (verify from Phase 2)
  - React.memo on ChartPanel and heavy chart components
  - Chart data Redis cache verified working (from Phase 3)

### 11. Final .env.example
Generate complete .env.example at project root:
  NEXTAUTH_SECRET=        # generate: openssl rand -base64 32
  NEXTAUTH_URL=           # e.g. http://localhost:3000
  DATABASE_URL=           # mysql://user:password@127.0.0.1:3306/superset_meta
  REDIS_URL=              # redis://localhost:6379
  ENCRYPTION_KEY=         # generate: openssl rand -hex 16

### After running this prompt
1. npm install sonner
2. npm run dev — full end to end test:
   a. Register a user
   b. Create a database connection and test it
   c. Create a dataset from a table
   d. Build a chart from the dataset
   e. Create a dashboard and add the chart
   f. Add a filter and verify cross-filtering
   g. Publish the dashboard and verify public URL works
3. npm run lint — fix all warnings
4. Update CLAUDE.md — mark all items complete
```
