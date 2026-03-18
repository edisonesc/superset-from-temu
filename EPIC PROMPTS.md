# Epic Prompt Set — Superset DIY Next.js App

# Run these in order inside Claude Code. Complete each phase fully before moving to the next.

# Between each prompt: npm install, run migrations, test, update CLAUDE.md checklist.

---

## PROMPT 1 — Foundation, Schema & Auth

```
Read CLAUDE.md fully before starting. This is Phase 1 of a 5-phase build.

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

Export a single `db` instance from db/index.ts using drizzle-orm and mysql2.
Export all table references from db/schema.ts as named exports.
Export all inferred types (e.g. type User = typeof users.$inferSelect).

### 2. Drizzle Client — db/index.ts
Create the singleton Drizzle client using mysql2 pool.
Read DATABASE_URL from process.env. Throw a clear error if it is missing.
Document with JSDoc.

### 3. Redis Client — lib/redis.ts
Create a singleton ioredis client.
Read REDIS_URL from process.env. Throw a clear error if it is missing.
Export a typed helper: cache.get<T>, cache.set<T>(key, value, ttlSeconds), cache.del.
Document with JSDoc.

### 4. Encryption Utility — lib/crypto.ts
Implement AES-256-GCM encrypt and decrypt functions.
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
Configure NextAuth.js v5 with:
  - Credentials provider (email + password, bcrypt comparison against password_hash)
  - JWT session strategy
  - Session includes: user id, email, name, role
  - Role typed as UserRole from types/index.ts
  - Callbacks to attach role to session and JWT
Read NEXTAUTH_SECRET from process.env.
Document with JSDoc.

### 8. Auth API Route — app/api/auth/[...nextauth]/route.ts
Wire up the NextAuth handler. Export GET and POST.

### 9. Auth Middleware — middleware.ts (project root)
Protect all routes under /dashboard/* and /api/* (except /api/auth/*).
Redirect unauthenticated requests to /login.
Use NextAuth's auth() helper.

### 10. Base Layout & Pages
Create the following with full Tailwind dark-mode styling (dark background, clean sidebar):

app/layout.tsx — root layout, sets dark mode class, wraps in SessionProvider
app/(auth)/login/page.tsx — login form, email + password, calls NextAuth signIn, shows errors
app/(dashboard)/layout.tsx — protected layout with sidebar navigation
  Sidebar links: Dashboards, Charts, SQL Lab, Datasets, Connections
  Show current user name and role in sidebar footer
  Logout button
app/(dashboard)/page.tsx — simple home/overview page placeholder

### 11. Registration API — app/api/auth/register/route.ts
POST endpoint to create a new user.
Validate body with Zod: email, password (min 8 chars), name.
Hash password with bcrypt (rounds: 12).
Insert into users table with role: gamma by default.
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
1. npm install next-auth@beta bcryptjs @types/bcryptjs zod @paralleldrive/cuid2
2. Add ENCRYPTION_KEY to .env.local (run: openssl rand -hex 16)
3. npx dotenv -e .env.local -- npx drizzle-kit generate
4. npx dotenv -e .env.local -- npx drizzle-kit migrate
5. npm run dev and verify /login renders
6. Update CLAUDE.md checklist
```

---

## PROMPT 2 — SQL Lab

```
Read CLAUDE.md fully before starting. This is Phase 2 of a 5-phase build.
Phase 1 is complete. All items in the CLAUDE.md checklist marked done are available to import.
Do not regenerate or modify anything from Phase 1.

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
  - Support both mysql and postgresql dialects dynamically

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
All routes: require auth session. Validate with Zod. Return ApiResponse<T>.
Only admin and alpha roles can create/edit/delete connections.

### 3. Query Execution API — app/api/query/route.ts
POST endpoint.
Body: { connectionId: string, sql: string }
Validate with Zod.
Call runQuery from lib/query-runner.ts.
Return ApiResponse<QueryResult>.
Require authenticated session.

### 4. Saved Queries API — app/api/saved-queries/route.ts + [id]/route.ts
Full CRUD for saved_queries.
GET — list saved queries for current user
POST — create saved query
PUT /[id] — update
DELETE /[id] — delete
Validate with Zod. Return ApiResponse<T>.

### 5. Query History API — app/api/query-history/route.ts
GET — return paginated query history for current user
Query params: page, pageSize, connectionId (optional filter)
Return PaginatedResponse<QueryHistory>.

### 6. Zustand Store — stores/sqllab-store.ts
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
  - Left panel (collapsible): schema browser — lists connections → databases → tables → columns
  - Main panel: CodeMirror 6 editor (SQL dialect, dark theme, line numbers, autocomplete)
  - Bottom panel: tabbed results area — Results tab + History tab

CodeMirror 6 setup:
  - Import from @codemirror/lang-sql, @codemirror/view, @codemirror/state
  - SQL dialect with schema-aware keyword completion
  - Dark theme matching app
  - Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run query

Results table:
  - Use TanStack Table
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
  - On connection select: fetch tables via a new GET /api/connections/[id]/schema endpoint (implement this)
  - Expandable tree: connection → tables → columns with type badges
  - Click table name to insert it into editor

### 8. Multi-tab support
SQL Lab supports multiple query tabs like Superset.
Each tab is independent: own SQL, own connection, own results.
Tabs are managed via sqllab-store.ts.
Add tab, close tab, rename tab (double-click).

### Output contract for next phase
After this phase the following must work:
- GET /api/connections returns connection list
- POST /api/query executes SQL and returns results
- /sqllab page renders editor, runs queries, shows results

### After running this prompt
1. npm install @codemirror/lang-sql @codemirror/view @codemirror/state @codemirror/theme-one-dark pg @types/pg
2. npm run dev and verify SQL Lab works end to end
3. Test: create a connection, run a SELECT query, verify results table renders
4. Update CLAUDE.md checklist
```

---

## PROMPT 3 — Chart System

```
Read CLAUDE.md fully before starting. This is Phase 3 of a 5-phase build.
Phase 1 and Phase 2 are complete. All items marked done in CLAUDE.md are available to import.
Do not regenerate or modify anything from previous phases.

### Goal
Build the complete chart system: registry pattern, 10 core chart types, chart builder UI,
chart data query layer, and chart explorer page.

### 1. Chart Registry — components/charts/registry.ts
This is the heart of the chart system. Define the registry as a map of vizType slug to ChartDefinition.

/**
 * Defines the contract every chart type must implement to be registered.
 */
type ChartDefinition = {
  vizType: ChartVizType           // unique slug
  label: string                   // display name
  description: string             // one-line description
  icon: string                    // lucide-react icon name
  configSchema: ChartConfigSchema // what the chart needs to render
  component: React.ComponentType<ChartComponentProps>  // the render component
  transformer: ChartTransformer   // converts raw query rows → chart props
  defaultConfig: Partial<ChartConfig>
}

Export:
  - chartRegistry: Record<ChartVizType, ChartDefinition>
  - getChart(vizType: ChartVizType): ChartDefinition
  - listCharts(): ChartDefinition[]

### 2. Shared Chart Types — types/index.ts (extend existing)
Add to types/index.ts:
  - ChartComponentProps — normalized data + config passed to every chart component
  - ChartConfig — the JSON stored in the charts table (dimensions, metrics, filters, etc.)
  - ChartConfigSchema — describes what columns/metrics a chart type requires
  - ChartTransformer — function signature: (rows: Row[], config: ChartConfig) => ChartComponentProps
  - Row — Record<string, unknown>

### 3. Implement 10 Core Chart Types
For each chart type create a file in components/charts/[vizType].tsx.
Each file exports: the React component, the transformer function, the config schema, and the default config.
Register all of them in registry.ts.

Implement these chart types using Apache ECharts (echarts-for-react):

1. bar — vertical and horizontal bar chart. Config: x_axis, metrics[], orientation.
2. line — line and area chart. Config: x_axis, metrics[], show_area (boolean).
3. pie — pie and donut chart. Config: dimension, metric, donut (boolean), show_labels.
4. scatter — scatter plot. Config: x_axis, y_axis, bubble_size (optional), color_dimension (optional).
5. area — stacked area chart. Config: x_axis, metrics[], stacked (boolean).
6. heatmap — heatmap grid. Config: x_axis, y_axis, metric.
7. big_number — single KPI metric with trend indicator. Config: metric, comparison_metric (optional), suffix, prefix.
8. big_number_total — big number without trend. Config: metric, suffix, prefix.
9. table — data table with sorting and pagination. Config: columns[], page_size. Use TanStack Table.
10. pivot_table — pivot table. Config: rows[], columns[], metrics[], aggregation.

All chart components:
  - Accept ChartComponentProps
  - Are responsive (use ResponsiveContainer or echarts resize observer)
  - Handle empty/null data gracefully with an empty state UI
  - Are dark-mode styled matching the app theme
  - Include JSDoc on the component and transformer

### 4. Chart Data Query Layer — lib/chart-query.ts
/**
 * Translates a chart's config and dataset definition into executable SQL,
 * runs it, and returns transformed data ready for the chart component.
 */
Export:
  buildChartQuery(chart: Chart, dataset: Dataset): string  — generates SQL from chart config
  fetchChartData(chartId: string, filters?: FilterContext): Promise<ChartComponentProps>
    — builds query, runs via runQuery, transforms via registry transformer, caches result

Cache chart data in Redis with key: chart:{chartId}:{hash(filters)}, TTL: QUERY_CACHE_TTL_SECONDS.

### 5. Charts API — app/api/charts/route.ts + [id]/route.ts + [id]/data/route.ts
GET /api/charts — list all charts (paginated)
POST /api/charts — create chart, validate config with Zod
GET /api/charts/[id] — get chart with dataset info joined
PUT /api/charts/[id] — update chart config
DELETE /api/charts/[id] — delete chart
GET /api/charts/[id]/data — fetch chart data (calls fetchChartData), supports filter query params
All routes: require auth. Return ApiResponse<T>.
Mutations require alpha or admin role.

### 6. Chart Builder — app/(dashboard)/charts/new/page.tsx + components/charts/ChartBuilder.tsx
Full chart builder UI. Use 'use client'. Layout mirrors Superset's explore view:

Left panel — Data tab:
  - Dataset selector (searchable dropdown)
  - Once dataset selected: show available columns with type badges
  - Dimension picker (drag columns to dimension slots)
  - Metric picker with aggregation selector (SUM, AVG, COUNT, MIN, MAX)
  - Time range selector (presets: Last 7 days, Last 30 days, This month, custom range picker)
  - Filters section (add column filters with operator and value)

Left panel — Customize tab:
  - Chart-type-specific config options rendered dynamically from configSchema
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
Grid of chart cards showing: chart name, viz type icon, dataset name, last updated.
Search bar to filter by name.
Click card → goes to chart explorer (/charts/[id]).
Create New Chart button → /charts/new.

### 8. Chart Explorer — app/(dashboard)/charts/[id]/page.tsx
View and edit an existing chart.
Same layout as Chart Builder but pre-populated with saved config.
Edit mode toggle — only alpha/admin can edit.
Share button — copies a deep link URL.

### Output contract for next phase
After this phase:
- GET /api/charts/[id]/data returns chart-ready data
- ChartBuilder renders a working chart from a real dataset
- All 10 chart types render correctly with sample data

### After running this prompt
1. npm install echarts echarts-for-react @tanstack/react-table
2. npm run dev and verify chart builder renders
3. Test: connect a dataset, build a bar chart, verify it renders with real data
4. Update CLAUDE.md checklist
```

---

## PROMPT 4 — Dashboard Engine

```
Read CLAUDE.md fully before starting. This is Phase 4 of a 5-phase build.
Phases 1, 2, and 3 are complete. All items marked done in CLAUDE.md are available to import.
Do not regenerate or modify anything from previous phases.

### Goal
Build the full dashboard engine: drag-and-drop grid canvas, filter bar with cross-chart
filtering, dashboard CRUD, view/edit modes, and public sharing.

### 1. Dashboard Zustand Store — stores/dashboard-store.ts
/**
 * Dashboard editor and viewer state.
 * Manages layout, active filters, edit mode, and chart panel states.
 */
State:
  - dashboard: Dashboard | null — currently loaded dashboard
  - layout: LayoutItem[] — grid positions for each chart panel
  - filters: FilterContext — active filter values keyed by filterId
  - isEditMode: boolean
  - isDirty: boolean — unsaved changes exist
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
  - saveDashboard() — PUT /api/dashboards/[id]
  - publishDashboard()

Export LayoutItem, FilterContext, FilterValue types.

### 2. Dashboards API — app/api/dashboards/route.ts + [id]/route.ts
GET /api/dashboards — list all published + owned dashboards (paginated)
POST /api/dashboards — create dashboard with name, slug (auto-generated from name), empty layout
GET /api/dashboards/[id] — get dashboard with charts joined
PUT /api/dashboards/[id] — update layout, filter_config, name, is_published
DELETE /api/dashboards/[id] — delete dashboard
GET /api/dashboards/slug/[slug] — get dashboard by slug (for public sharing)
All routes: require auth except slug route (supports public dashboards).
Mutations require alpha or admin role.
Return ApiResponse<T>.

### 3. Dashboard Grid Canvas — components/dashboard/DashboardCanvas.tsx
/**
 * The main drag-and-drop grid canvas for arranging chart panels.
 * Uses dnd-kit for drag/resize and CSS Grid for layout.
 */
Use dnd-kit (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities).
Grid: 12-column CSS grid. Each panel has col span and row span stored in layout.
In edit mode:
  - Panels are draggable and resizable
  - Drag handle visible on hover
  - Resize handle at bottom-right corner
  - Delete panel button on hover
  - Add Chart button (opens chart picker modal)
In view mode:
  - Panels are static
  - Charts render with live data
  - Clicking a chart element triggers cross-filter (see filter system)

Each panel renders a ChartPanel component (see below).

### 4. Chart Panel — components/dashboard/ChartPanel.tsx
/**
 * A single chart panel within the dashboard canvas.
 * Handles its own data fetching, loading, and error states.
 */
Props: chartId, panelId, isEditMode, filters (FilterContext)
  - Fetches chart data from GET /api/charts/[id]/data with active filters as query params
  - Shows loading skeleton while fetching (TanStack Query)
  - Shows error state with retry button on failure
  - Renders chart component from registry
  - In edit mode: shows drag handle, resize handle, delete button, chart name
  - Emits cross-filter events on chart element click (bar click, pie slice click, etc.)

### 5. Filter Bar — components/dashboard/FilterBar.tsx
/**
 * Global filter bar that broadcasts filter values to all charts on the dashboard.
 * Supports value filters, time range filters, and numerical range filters.
 */
Filter types to support:
  - Value filter — select one or many values from a dimension column
  - Time range filter — date range picker with presets
  - Numerical range filter — min/max slider

Each filter config stored in dashboard.filter_config as JSON.
Active filter values stored in dashboard-store.ts filters state.
When a filter changes: invalidate TanStack Query cache for all chart panels on this dashboard.
In edit mode: show Add Filter button, configure which column each filter targets.

### 6. Cross-Filter System
When user clicks a chart element (bar, pie slice, scatter point):
  - Emit a cross-filter event via dashboard-store setFilter
  - All other ChartPanel components on the same dashboard re-fetch with the new filter applied
  - Active cross-filters shown as dismissible chips in the filter bar
  - Clear All button resets all cross-filters

Implement click handlers in each chart component that call an onCrossFilter callback prop.
ChartComponentProps must include: onCrossFilter?: (dimension: string, value: unknown) => void

### 7. Dashboard Viewer — app/(dashboard)/dashboards/[id]/page.tsx
Full dashboard view page.
Loads dashboard by ID via dashboard-store loadDashboard.
Renders FilterBar + DashboardCanvas.
Edit button (alpha/admin only) → toggles edit mode.
In edit mode: show Save button, Discard Changes button, Publish toggle.
Unsaved changes prompt on navigate away (isDirty check).

### 8. Dashboard List — app/(dashboard)/dashboards/page.tsx
Grid of dashboard cards: name, description, chart count, last updated, published badge.
Search and filter by published/draft.
Create New Dashboard button.
Click card → /dashboards/[id].

### 9. Public Dashboard Sharing — app/public/dashboard/[slug]/page.tsx
Public route — no auth required.
Loads dashboard by slug via GET /api/dashboards/slug/[slug].
Only renders if is_published = true, else shows 404.
Read-only: no edit mode, no filter bar editing.
Full chart rendering with live data.
Shareable URL shown in dashboard header for admin/alpha users.

### 10. Dashboard Embed
Add ?embed=true query param support to the public dashboard route.
When embed=true: hide header, sidebar, and all chrome — render canvas only.
Suitable for iFrame embedding.

### Output contract for next phase
After this phase:
- Dashboards can be created, charts added, layout saved
- Filters broadcast to all charts
- Cross-filtering works between charts
- Public sharing via slug works

### After running this prompt
1. npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
2. npm run dev and verify dashboard canvas renders
3. Test: create a dashboard, add 2 charts, drag to rearrange, save layout
4. Test: add a filter, verify both charts re-fetch with filter applied
5. Update CLAUDE.md checklist
```

---

## PROMPT 5 — Dataset Manager & Final Polish

```
Read CLAUDE.md fully before starting. This is Phase 5 of a 5-phase build.
Phases 1–4 are complete. All items marked done in CLAUDE.md are available to import.
Do not regenerate or modify anything from previous phases.

### Goal
Build the dataset manager, schema browser, connection manager UI, app-wide polish,
and production-readiness hardening.

### 1. Dataset API — app/api/datasets/route.ts + [id]/route.ts + [id]/columns/route.ts
GET /api/datasets — list all datasets (paginated, searchable by name)
POST /api/datasets — create dataset (physical table or virtual/SQL-defined)
GET /api/datasets/[id] — get dataset with connection info joined
PUT /api/datasets/[id] — update dataset (name, description, sql_definition, column_metadata)
DELETE /api/datasets/[id] — delete dataset (check no charts depend on it — return 409 if so)
GET /api/datasets/[id]/columns — return column list with inferred types from live DB introspection
All routes: require auth. Mutations require alpha or admin. Return ApiResponse<T>.

### 2. Schema Introspection — lib/schema-introspector.ts
/**
 * Introspects a live database connection to discover tables and column metadata.
 * Supports both MySQL and PostgreSQL dialects.
 */
Export:
  getTables(connectionId: string): Promise<TableInfo[]>
  getColumns(connectionId: string, tableName: string): Promise<ColumnInfo[]>
  getRowCount(connectionId: string, tableName: string): Promise<number>

TableInfo: { name, schema, rowCount (estimated) }
ColumnInfo: { name, dataType, nullable, isPrimaryKey, isForeignKey }

Use INFORMATION_SCHEMA queries for MySQL and pg_catalog for PostgreSQL.
Cache results in Redis: schema:{connectionId}:{tableName}, TTL: 60 seconds.

### 3. Dataset Manager UI — app/(dashboard)/datasets/page.tsx
List view of all datasets.
Columns: name, type (physical/virtual), connection name, table/sql, chart count, last updated.
Search bar.
Create Dataset button → opens create modal.
Click row → opens dataset detail/edit page.

### 4. Dataset Detail — app/(dashboard)/datasets/[id]/page.tsx
Two tabs:

Overview tab:
  - Dataset name, description (editable inline for alpha/admin)
  - Connection info
  - For physical datasets: table name
  - For virtual datasets: SQL editor (CodeMirror, read-only for gamma)
  - Charts using this dataset (list with links)

Columns tab:
  - Table of all columns: name, data type, label (editable), description (editable),
    is_temporal toggle, is_filterable toggle, is_groupable toggle
  - Sync Columns button — re-introspects live DB and updates column_metadata
  - Save Changes button

### 5. Connection Manager UI — app/(dashboard)/connections/page.tsx + new/page.tsx + [id]/page.tsx
List page: table of all connections — name, dialect badge, host, database, created by, test status.
Test Connection button per row — calls POST /api/connections/[id]/test.
Create New Connection button → /connections/new.

Create/Edit form:
  - Name, description inputs
  - Dialect selector (MySQL / PostgreSQL) — changes port default dynamically
  - Host, port, database name, username, password inputs
  - Test Connection button (inline, before saving) — calls testConnection from query-runner
  - Save button — only enabled after successful test
  - Password field: masked, show/hide toggle, never returned from API

Add POST /api/connections/[id]/test route — calls testConnection, returns { success, message }.

### 6. User Management — app/(dashboard)/admin/users/page.tsx
Admin-only page (redirect non-admin to 404).
Table of all users: email, name, role, created at.
Edit role dropdown per user (admin can change gamma ↔ alpha ↔ admin).
PUT /api/admin/users/[id]/role route — admin only, updates user role.

### 7. App-wide Polish

Navigation:
  - Active route highlighted in sidebar
  - Breadcrumbs on all inner pages
  - Page titles set via Next.js metadata API

Empty states:
  - All list pages have illustrated empty states with a CTA when no items exist
  - e.g. "No dashboards yet — Create your first dashboard"

Loading states:
  - All data-fetching pages use loading.tsx skeletons
  - Skeleton components match the shape of the real content (not generic spinners)

Toast notifications:
  - Success/error toasts on all mutations (save chart, save dashboard, run query, etc.)
  - Use sonner or a shadcn/ui toast primitive

Keyboard shortcuts:
  - Ctrl+S / Cmd+S — save in chart builder and dashboard editor
  - Ctrl+Enter / Cmd+Enter — run query in SQL Lab (already done, verify)
  - Escape — close modals

### 8. Error Hardening
Audit all API routes and ensure:
  - Every route has try/catch
  - No raw DB errors reach the client
  - Zod validation errors return 400 with readable messages
  - Auth errors return 401
  - Permission errors return 403

Audit all client components and ensure:
  - Every data-fetching component has error state UI
  - Every mutation has error handling with user-facing toast

### 9. Performance
  - All list pages are paginated (use DEFAULT_PAGE_SIZE from constants.ts)
  - Chart data is cached in Redis (already implemented in Phase 3 — verify)
  - Dashboard chart panels load in parallel (Promise.all, not sequential)
  - SQL Lab results table is virtualized for large result sets (already done — verify)
  - Add React.memo to ChartPanel and heavy chart components

### 10. Final .env.example
Generate a complete .env.example with all required variables and comments:
  NEXTAUTH_SECRET=        # generate with: openssl rand -base64 32
  NEXTAUTH_URL=           # e.g. http://localhost:3000
  DATABASE_URL=           # mysql://user:password@host:port/dbname
  REDIS_URL=              # redis://localhost:6379
  ENCRYPTION_KEY=         # generate with: openssl rand -hex 16

### After running this prompt
1. npm install sonner (for toasts)
2. npm run dev — full end to end test:
   a. Register a user
   b. Create a database connection
   c. Create a dataset from a table
   d. Build a chart from the dataset
   e. Create a dashboard and add the chart
   f. Add a filter and verify cross-filtering
   g. Publish the dashboard and verify public URL works
3. Run npm run lint — fix all warnings
4. Update CLAUDE.md — mark all items complete
```
