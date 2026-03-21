### 1. Visualization and Dashboard Engine
The platform includes a robust system for creating and sharing data insights:
*   **Comprehensive Charting:** It supports **11 chart types**, including Bar, Line, Pie, Scatter, Heatmap, and Geo. These are rendered using **ECharts** (specifically `echarts-for-react`).
*   **Interactive Dashboards:** Users can perform **CRUD operations** on dashboards, which feature a **drag-and-drop grid layout**. 
*   **Public Sharing:** The engine supports publishing dashboards via **slug-based public URLs** and an **embed mode** for external use.
*   **Markdown Support:** While a backlog item, the architecture is designed to support **Markdown/Text panels** to provide context within dashboards.

### 2. Advanced Filtering System
A central feature of the dashboard experience is the **native filter bar**, which mirrors Superset's sidebar or top-bar functionality:
*   **Filter Widgets:** The system implements three primary widget types: **DateRange** (with time grain selection), **Select** (multi-select searchable dropdowns), and **Search** (debounced text input).
*   **Global Application:** Filters are scoped to a dashboard and can be applied globally to all charts or targeted to specific ones.
*   **State Management:** Filter state is managed entirely in-memory using **Zustand v5**, while filter configurations (definitions) are persisted in the database.
*   **Cross-Filtering:** The system supports **cross-chart click filtering**, where clicking a data point in one chart filters others on the same dashboard.

### 3. SQL Lab and Data Connectivity
The platform serves as a powerful IDE for data analysts:
*   **SQL Lab:** This feature includes a **SQL editor**, query history, saved queries, and a **schema browser** with resizable panes. 
*   **Multi-Database Support:** It connects to both **MySQL and PostgreSQL** databases. For security, database credentials (passwords) are **AES-256-GCM encrypted** in the metadata database and never leave the server.
*   **Dataset Management:** Users can define **physical and virtual datasets** with rich column metadata.

### 4. Core Infrastructure and Security
The underlying architecture ensures performance and controlled access:
*   **Authentication and Roles:** Utilizing **NextAuth v5**, the system implements four distinct roles: **Admin, Alpha, Gamma, and Public**.
*   **Performance Caching:** A **Redis query cache** with a 5-minute TTL is implemented to speed up frequent chart queries.
*   **Safe Query Execution:** All data fetching uses **parameterized queries** via Drizzle ORM or `mysql2` prepared statements to prevent SQL injection. The system also automatically enforces a **MAX_QUERY_ROWS** limit (10,000) to protect database performance.

### 5. Future Feature Backlog (ROI-Ranked)
The sources identify several key features currently in the "backlog" or "gap analysis" phase to further align the POC with the full Apache Superset experience:
*   **Saved Metrics:** Dataset-level named metrics with an aggregation builder (e.g., "Total Revenue" as `SUM(revenue)`).
*   **Enhanced Time-Series Handling:** Improved **Time Grain** and temporal column handling for more granular time-based analytics.
*   **Layout Improvements:** Adding **panel resizing** handles to the dashboard editor and **tabbed layouts** to organize large numbers of charts.
*   **Ad-hoc Controls:** Adding row limits, `ORDER BY` clauses, and chart-level filters directly within the Chart Builder.

# Verbose

## Summary Table

| Feature | Layer | Status |
|---------|-------|--------|
| F01 Credential Auth | UI/API/System | Complete |
| F02 User Registration | API | API only (no UI) |
| F03 RBAC (admin/alpha/gamma/public) | System | Complete |
| F04 Admin User Management | UI/API | Complete |
| F05 DB Connection Management | UI/API | Connection listing/edit page incomplete |
| F06 Password Encryption AES-256-GCM | System | Complete |
| F07 Schema Introspection | API/Data | Complete |
| F08 Dataset Management (Physical+Virtual) | UI/API | Dataset edit page missing |
| F09 Distinct Column Values Fetch | API/Data | Complete |
| F10 Chart Type Registry (11 types) | UI | Complete |
| F11 Chart Builder UI | UI/API | Complete |
| F12 SQL Query Generation Engine | Data | Complete |
| F13 Time Grain / DATE_TRUNC Mapping | Data | Missing minute/hour grains |
| F14 Ad-Hoc Chart Filters | UI/Data | Complete |
| F15 Dataset Default Filters | Data | No UI to configure |
| F16 Redis Query Result Caching | System | Complete |
| F17 Cache Invalidation on Update | System | Complete |
| F18 SQL Execution + Row Limit | API/Data | Complete |
| F19 SQL Lab | UI/API | Core complete |
| F20 Saved Queries | API | Complete |
| F21 Query History Audit Log | API/Data | Complete |
| F22 Dashboard Management + Slugs | UI/API | Complete |
| F23 Drag-Drop Grid Layout | UI | Complete |
| F24 Markdown Text Panels | UI | No inline editor |
| F25 Dashboard Publish / Public URL | UI/API | Complete |
| F26 Embed Mode | UI | Complete |
| F27 Cross-Filtering | UI/API | Complete |
| F28 Native Filter Bar (3 types) | UI/API | Complete |
| F29 Filter Configuration Modal | UI/API | Complete |
| F30 Chart Auto-Refresh | UI | Complete |
| F31 Unsaved Changes Guard | UI | Complete |
| F32 Theme Toggle Light/Dark | UI | Complete |
| F33 Client-Side Aggregation Engine | Data | Complete |
| F34 Geo Chart | UI/Data | Complete |
| F35 Pivot Table Chart | UI/Data | Client-side pivot only |
| F36 Big Number / KPI Charts | UI | Complete |
| F37 Sortable Data Table Chart | UI | Client-side sort only |
| F38 Chart Error Boundary + Retry | UI | Complete |
| F39 Public Chart Auth Check | API/System | Complete |
| F40 Saved Metrics on Datasets | Data | No UI to configure |
| F41 Column Metadata Storage/Refresh | Data/API | No manual refresh UI |
| F42 Health Check Endpoint | API/System | Process-liveness only |

---

## F01 — Credential-Based Authentication
- **Layer**: UI / API / System
- **Description**: Email + password login via NextAuth v5 Credentials provider. JWT session (8h maxAge) with `id` and `role` embedded. Login page shows error state, loading state. Auth middleware protects all routes except `/login`, `/public/*`, `/api/auth/*`, `/api/public/*`.
- **Trigger**: User submits login form
- **Dependencies**: `app/(auth)/login/page.tsx`, `lib/auth.ts`, `auth.config.ts`, `middleware.ts`, `db/schema.ts` (users table)
- **Edge Cases**: No forgot-password flow (UI shows "Ask administrator"). No OAuth providers. No email verification.
- **Missing**: Password reset flow, account lockout, 2FA

---

## F02 — User Registration
- **Layer**: API
- **Description**: POST `/api/auth/register` accepts `{ email, password (min 8), name }`. Hashes password with bcryptjs salt factor 12. Creates user with default role `gamma`. Returns `{ id }`.
- **Trigger**: System / developer (no UI-accessible registration page found)
- **Dependencies**: `app/api/auth/register/route.ts`, `db/schema.ts`, `bcryptjs`
- **Edge Cases**: Returns 409 if email already exists. No email confirmation step.
- **Missing**: Public self-registration UI

---

## F03 — RBAC Role Model (admin / alpha / gamma / public)
- **Layer**: System
- **Description**: Four-tier role system enforced per API route. `admin`: full access + user management. `alpha`: create/edit all resources. `gamma`: view-only, execute queries, save own queries. `public`: read-only embed access. Role stored in JWT, checked server-side on every mutation.
- **Trigger**: System (every protected API call)
- **Dependencies**: `db/schema.ts`, `lib/auth.ts`, all API route handlers
- **Edge Cases**: Admin cannot downgrade own role. No per-resource permissions (coarse-grained).
- **Missing**: Row-level security, per-dashboard permissions, granular read vs. write per resource

---

## F04 — Admin User Management
- **Layer**: UI / API
- **Description**: `/admin/users` page lists all users (id, email, name, role, createdAt). Admin can change any user's role via PUT `/api/admin/users/[id]/role`. Admin protected from self-demotion.
- **Trigger**: Admin user interaction
- **Dependencies**: `app/(dashboard)/admin/users/page.tsx`, `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/role/route.ts`
- **Edge Cases**: Admin cannot downgrade own role. No user deletion endpoint.
- **Missing**: User deletion, invite flow, bulk role assignment

---

## F05 — Database Connection Management (MySQL / PostgreSQL)
- **Layer**: UI / API / System
- **Description**: Create, test, edit, delete external DB connections. Supports MySQL and PostgreSQL dialects. Dialect selection auto-populates port (3306 / 5432). Password encrypted with AES-256-GCM before storage. Test endpoint validates connectivity before/after save. Password never returned to client.
- **Trigger**: User fills and submits connection form
- **Dependencies**: `app/(dashboard)/connections/`, `app/api/connections/`, `lib/crypto.ts`, `lib/query-runner.ts`, `db/schema.ts` (database_connections)
- **Edge Cases**: Password show/hide toggle in UI. Test result shown inline. No edit/list page fully implemented.
- **Missing**: Connection listing page detail view, connection editing page

---

## F06 — Password Encryption (AES-256-GCM)
- **Layer**: System
- **Description**: External DB passwords encrypted before storage and decrypted on query execution. Algorithm: AES-256-GCM, 12-byte random IV, 16-byte auth tag. Encoded as Base64 [IV | authTag | ciphertext]. Key sourced from `ENCRYPTION_KEY` env var (must be 64-char hex).
- **Trigger**: System (connection create/update, query execution)
- **Dependencies**: `lib/crypto.ts`, `ENCRYPTION_KEY` env var
- **Edge Cases**: Auth tag failure throws on tampered ciphertext. Key must be exactly 32 bytes (64 hex chars).
- **Missing**: Key rotation mechanism

---

## F07 — Database Schema Introspection
- **Layer**: API / Data
- **Description**: GET `/api/connections/[id]/schema` live-introspects external DB tables and columns. MySQL: queries INFORMATION_SCHEMA. PostgreSQL: queries information_schema + pg_catalog. Returns `{ name, columns: [{ name, dataType, nullable }] }[]`. Includes PK/FK detection.
- **Trigger**: System (on dataset creation page, column metadata fetch)
- **Dependencies**: `lib/schema-introspector.ts`, `app/api/connections/[id]/schema/route.ts`
- **Edge Cases**: Results cached 60 seconds in Redis. Stale if schema changes within TTL.
- **Missing**: Manual refresh button to bust cache

---

## F08 — Dataset Management (Physical + Virtual)
- **Layer**: UI / API / Data
- **Description**: Two dataset types: (1) Physical — points to a named table in a connection, metadata auto-populated from schema introspection. (2) Virtual — user-defined SQL subquery as the dataset source. Both support saved metrics (named expressions) and default filters (always-applied WHERE clauses) added in migration 0001. Column metadata stored as JSON.
- **Trigger**: User fills new dataset form
- **Dependencies**: `app/(dashboard)/datasets/`, `app/api/datasets/`, `db/schema.ts` (datasets), `lib/schema-introspector.ts`
- **Edge Cases**: Cannot delete dataset if charts depend on it (returns 409). Column metadata cleared on table/SQL change. Virtual dataset columns resolved via `SELECT ... LIMIT 0`.
- **Missing**: Dataset detail/edit page, column-level descriptions in UI, testing virtual SQL before save

---

## F09 — Distinct Column Values Fetch (for SelectWidget)
- **Layer**: API / Data
- **Description**: GET `/api/datasets/[id]/values?column=<col>` returns up to 500 distinct non-null values for a column. Column name sanitized (`[^a-zA-Z0-9_.]` stripped). Validates column against stored metadata. SQL: `SELECT DISTINCT col FROM source WHERE col IS NOT NULL ORDER BY col LIMIT 500`.
- **Trigger**: System (SelectWidget opens dropdown, FilterConfigModal selects column)
- **Dependencies**: `app/api/datasets/[id]/values/route.ts`, `lib/query-runner.ts`, Redis
- **Edge Cases**: 5-minute Redis cache. Returns 400 if column not in dataset metadata.
- **Missing**: Search/filter on server side for large cardinality columns (>500 unique values)

---

## F10 — Chart Type Registry (11 viz types)
- **Layer**: UI / Data
- **Description**: Central registry mapping vizType slugs to `{ component, transformer, configSchema, defaultConfig }`. Registered types: `bar`, `line`, `pie`, `scatter`, `area`, `heatmap`, `big_number`, `big_number_total`, `table`, `pivot_table`, `geo`.
- **Trigger**: System (chart render, builder config form)
- **Dependencies**: `components/charts/registry.ts`, `components/charts/*.tsx`
- **Edge Cases**: Unknown vizType renders gracefully with error message in ChartPanel.
- **Missing**: Custom viz type plugin system

---

## F11 — Chart Builder (Full Configuration UI)
- **Layer**: UI / API
- **Description**: Multi-panel form for creating/editing charts. Fields: dataset selector, vizType selector, metrics (multi-select with aggregation), dimensions (x_axis, y_axis, dimension, rows/cols for pivot, geo cols), time column + time grain (off/day/week/month/quarter/year), ad-hoc filters (column + operator + value), limit, order_by, auto-refresh interval (0/10/30/60/300s). Real-time chart preview via POST `/api/charts/preview`. Save via POST/PUT `/api/charts`.
- **Trigger**: User interaction in chart editor
- **Dependencies**: `components/charts/ChartBuilder.tsx`, `app/api/charts/preview/route.ts`, `app/api/charts/`, `lib/chart-query.ts`
- **Edge Cases**: Preview is ephemeral (no caching). Filter operators: ==, !=, >, <, >=, <=, in, not in, like.
- **Missing**: Formula/expression metric builder, color palette config, tooltip customization

---

## F12 — SQL Query Generation Engine
- **Layer**: Data / API
- **Description**: `buildChartQuery(chart, dataset, dialect)` generates parameterized SQL from chart config. Resolves saved metrics → SQL expressions. Applies `GROUP BY` only for aggregating charts (not table/pivot_table). Wraps in subquery for each filter layer. Dialect-aware identifier quoting (PG: `"col"`, MySQL: `` `col` ``).
- **Trigger**: System (chart preview, chart data fetch)
- **Dependencies**: `lib/chart-query.ts`
- **Edge Cases**: Virtual datasets wrapped as subquery `(SELECT ...) AS __dataset__`. Table/pivot_table: `SELECT *` if no dimensions specified. ORDER BY applied before filter wrapping.
- **Missing**: Computed columns, window functions, HAVING clause support

---

## F13 — Time Grain Aggregation with DATE_TRUNC Mapping
- **Layer**: Data
- **Description**: When a chart config specifies `timeColumn` + `timeGrain`, the query engine wraps the time column in a dialect-specific truncation function. PostgreSQL: `DATE_TRUNC('grain', col)`. MySQL: `DATE_FORMAT(col, fmt)` or `CONCAT(YEAR, '-Q', QUARTER)` for quarter.
- **Trigger**: System (query generation when timeGrain is set)
- **Dependencies**: `lib/chart-query.ts` (`getTimeExpression()`), `types/index.ts` (TimeGrain enum)
- **Edge Cases**: No time zone conversion — depends on DB/client timezone. Quarter grain uses different formula per dialect. `timeGrain: 'off'` or absent skips truncation.
- **Missing**: Minute/hour grains (types show day as minimum), explicit UTC normalization

---

## F14 — Ad-Hoc Chart-Level Filters
- **Layer**: UI / Data
- **Description**: Filters baked into chart definition (`config.filters`). Applied as WHERE conditions in `buildChartQuery`. Operators: `==` (=), `!=` (<>), `>`, `<`, `>=`, `<=`, `in` (IN list), `not in` (NOT IN list), `like` (LIKE '%val%'). String values escaped (`'` → `''`). LIKE chars escaped.
- **Trigger**: User adds filter in Chart Builder, then baked at save time
- **Dependencies**: `lib/chart-query.ts` (`applyAdHocFilters()`), `components/charts/ChartBuilder.tsx`
- **Edge Cases**: Multiple filters AND'd together. `in`/`not in` values split by comma.
- **Missing**: OR logic, nested filter groups, NULL checks

---

## F15 — Dataset Default Filters (Always-Applied)
- **Layer**: Data / API
- **Description**: `dataset.defaultFilters` (JSON, migration 0001) contains FilterItem[] applied to ALL queries against a dataset, regardless of chart or dashboard context. Enforced server-side in `buildChartQuery`, cannot be overridden by end users.
- **Trigger**: System (every query against the dataset)
- **Dependencies**: `lib/chart-query.ts`, `db/schema.ts` (datasets.defaultFilters)
- **Edge Cases**: Applied before cross-filters and native filters. No UI to configure this yet (only stored via API/migration).
- **Missing**: Dataset-level filter configuration UI

---

## F16 — Redis-Based Query Result Caching
- **Layer**: System
- **Description**: All SQL query results cached in Redis keyed by SHA256 of `connectionId:sql`. TTL: 300 seconds. Chart data additionally keyed by `chart:{id}:{filterHash}`. Public chart data keyed separately. Cache bypass available (SQL Lab always bypasses). `delPattern` uses SCAN for non-blocking bulk invalidation.
- **Trigger**: System (every query execution)
- **Dependencies**: `lib/redis.ts`, `lib/query-runner.ts`, `lib/chart-query.ts`, `REDIS_URL` env var
- **Edge Cases**: Redis errors are swallowed (cache miss fallback). `bypassCache=true` skips both read and write. delPattern uses SCAN cursor loop.
- **Missing**: Per-user cache isolation, cache warming, cache size limits/eviction policy config

---

## F17 — Cache Invalidation on Resource Update
- **Layer**: System
- **Description**: When a chart is updated (PUT `/api/charts/[id]`), `cache.delPattern('chart:${id}:*')` removes all cached results for that chart. When a dataset is updated, all charts depending on that dataset have their caches cleared.
- **Trigger**: System (resource save)
- **Dependencies**: `app/api/charts/[id]/route.ts`, `app/api/datasets/[id]/route.ts`, `lib/redis.ts`
- **Edge Cases**: Pattern scan is async/non-blocking but eventual. Charts referencing deleted datasets still have stale cache entries until TTL expires.
- **Missing**: Schema change → automatic cache invalidation

---

## F18 — SQL Query Execution with Row Limit Enforcement
- **Layer**: API / Data / System
- **Description**: `runQuery()` enforces MAX_QUERY_ROWS (10,000) by appending `LIMIT` if absent on SELECT queries. Uses mysql2/promise (10s connect timeout) or pg client (10s connection timeout). Logs every execution to `query_history` with status, duration, row count, error message.
- **Trigger**: System (chart data fetch, SQL Lab execution, column values fetch)
- **Dependencies**: `lib/query-runner.ts`, `db/schema.ts` (query_history), mysql2, pg
- **Edge Cases**: Raw DB errors wrapped before returning to client (no error leakage). No server-side query timeout beyond connection timeout.
- **Missing**: Per-user query rate limiting, query kill mechanism, configurable row limits

---

## F19 — SQL Lab
- **Layer**: UI / API
- **Description**: Interactive SQL editor with CodeMirror 6 (SQL syntax highlighting, line numbers, active-line highlight, Ctrl/Cmd+Enter to run). Connection selector. Query results in table. Multiple query tabs via Zustand sqllab-store. Query history tracking. Saved queries per user (CRUD via `/api/saved-queries`).
- **Trigger**: User writes and executes SQL
- **Dependencies**: `components/sqllab/SqlEditor.tsx`, `app/(dashboard)/sqllab/`, `app/api/query/route.ts`, `app/api/saved-queries/`, `stores/sqllab-store.ts`
- **Edge Cases**: Always bypasses cache (`bypassCache=true`). Results limited to MAX_QUERY_ROWS.
- **Missing**: Query formatting (sql-formatter installed but integration not confirmed), result export (CSV/JSON), tab persistence across reload

---

## F20 — Saved Query Management
- **Layer**: API
- **Description**: Users can save SQL queries with name + description. Queries scoped to creator (`createdBy === session.user.id`). CRUD via `/api/saved-queries`. GET lists own queries. PUT/DELETE enforce ownership.
- **Trigger**: User saves query in SQL Lab
- **Dependencies**: `app/api/saved-queries/`, `db/schema.ts` (saved_queries)
- **Edge Cases**: No sharing mechanism. Only owner can edit/delete.
- **Missing**: Shared query library, query versioning

---

## F21 — Query History Audit Log
- **Layer**: API / Data
- **Description**: Every SQL execution (charts, SQL Lab, previews) appended to `query_history` table. Immutable (no updatedAt). Stores: sql, connectionId, executedBy, status (success/error), rowCount, durationMs, errorMessage. GET `/api/query-history` returns paginated history for current user, filterable by connectionId.
- **Trigger**: System (every runQuery call)
- **Dependencies**: `app/api/query-history/route.ts`, `lib/query-runner.ts`, `db/schema.ts` (query_history)
- **Edge Cases**: Errors also recorded (errorMessage field). No admin view of all users' history.
- **Missing**: Admin-level query history view, query replay from history

---

## F22 — Dashboard Management (CRUD + Slugs + Tabs)
- **Layer**: UI / API
- **Description**: Create dashboards with name + description. Auto-generates URL slug (lowercase, `[^a-z0-9]+` → `-`, CUID suffix on collision). Supports multi-tab layouts. Layout stored as JSON (dnd-kit serialized). Dashboard cards show status badge, last updated. Search and status filter (all/published/draft) on listing page.
- **Trigger**: User creates/edits dashboard
- **Dependencies**: `app/(dashboard)/dashboards/`, `app/api/dashboards/`, `db/schema.ts` (dashboards, dashboard_charts)
- **Edge Cases**: Slug uniqueness enforced at DB level. `dashboard_charts` join table synced on layout save (chart panels extracted, markdown panels skipped).
- **Missing**: Dashboard duplication, dashboard templates

---

## F23 — Drag-and-Drop Dashboard Grid Layout
- **Layer**: UI
- **Description**: 12-column CSS Grid, 80px row height. Panels are draggable (dnd-kit) and resizable (mouse drag on bottom-right corner). Layout persisted to Zustand store on drag end. Two panel types: ChartPanel and MarkdownPanel. Tab-based panel grouping supported.
- **Trigger**: User drags panel or drags resize handle
- **Dependencies**: `components/dashboard/DashboardCanvas.tsx`, `@dnd-kit/core`, `@dnd-kit/sortable`, `stores/dashboard-store.ts`
- **Edge Cases**: Edit mode only (drag/resize disabled in view mode). Layout saved on explicit Save, not auto-saved.
- **Missing**: Snap-to-grid, minimum panel size enforcement, panel z-index management

---

## F24 — Markdown Text Panels
- **Layer**: UI
- **Description**: Dashboard supports text panels that render Markdown (react-markdown + remark-gfm). Panels can be added, repositioned, and resized like chart panels.
- **Trigger**: User adds markdown panel via dashboard edit mode
- **Dependencies**: `components/dashboard/DashboardCanvas.tsx`, `components/dev-tab/markdown.tsx`, `react-markdown`, `remark-gfm`
- **Edge Cases**: No inline editing — markdown source must be configured elsewhere.
- **Missing**: Inline markdown editor in panel, HTML support

---

## F25 — Dashboard Publish / Public URL
- **Layer**: UI / API
- **Description**: Dashboard has `isPublished` flag. Published dashboards accessible at `/public/dashboard/[slug]` without authentication. Chart data served from `/api/public/charts/[id]/data` (verifies chart belongs to a published dashboard). Toggle publish button in dashboard header.
- **Trigger**: User clicks Publish/Unpublish button
- **Dependencies**: `app/(dashboard)/dashboards/[id]/page.tsx`, `app/public/dashboard/[slug]/page.tsx`, `app/api/dashboards/slug/[slug]/route.ts`, `app/api/public/charts/[id]/data/route.ts`
- **Edge Cases**: Public charts use chart creator's userId for query history. Unpublished dashboards return 404 on public URL.
- **Missing**: Password-protected sharing, expiring share links

---

## F26 — Embed Mode for Public Dashboards
- **Layer**: UI
- **Description**: Public dashboard URL with `?embed=true` query param hides sidebar, footer, and cross-filter chips. Designed for iframe embedding. Tab bar still rendered.
- **Trigger**: System (URL param detection on page load)
- **Dependencies**: `app/public/dashboard/[slug]/page.tsx`
- **Edge Cases**: Embed mode is purely cosmetic — no auth or CORS changes.
- **Missing**: iframe CSP headers, embed token-based access control

---

## F27 — Cross-Filtering (Click-Based)
- **Layer**: UI / API
- **Description**: Clicking a chart element (bar, pie slice, scatter point, etc.) emits `onCrossFilter(column, value)`. Dashboard store stores cross-filter state. All ChartPanels re-query with cross-filter as URL param (non-reserved key=value). Applied server-side as WHERE conditions.
- **Trigger**: User clicks chart element
- **Dependencies**: `components/dashboard/ChartPanel.tsx`, `components/charts/*.tsx`, `stores/dashboard-store.ts`, `lib/chart-query.ts` (`applyFilters()`)
- **Edge Cases**: Toggle behavior — clicking same value clears filter. Multiple charts can be cross-filtered simultaneously. Public dashboards support cross-filtering too.
- **Missing**: Cross-filter scope (currently applies to all charts), multi-value cross-filter

---

## F28 — Native Filter Bar (Typed Dashboard Filters)
- **Layer**: UI / API
- **Description**: Collapsible filter sidebar with three filter widget types: (1) `date_range` — two date inputs + time grain selector. (2) `select` — multi-select dropdown with lazy-loaded distinct values + search. (3) `search` — text input LIKE filter. Filter configs stored in `dashboard.filterConfig`. Values managed in Zustand filterStore. Filters target specific charts (all or subset). Sent as `__nf__` JSON param to chart data endpoints.
- **Trigger**: User changes filter value, or admin configures filter
- **Dependencies**: `components/filters/FilterBar.tsx`, `components/filters/DateRangeWidget.tsx`, `components/filters/SelectWidget.tsx`, `components/filters/SearchWidget.tsx`, `stores/filterStore.ts`, `lib/chart-query.ts` (`applyNativeFilters()`)
- **Edge Cases**: Filter scoping via `targetChartIds`. Edit mode shows add/edit/delete buttons. Collapse/expand with count badge. Date range filtering uses `>=`/`<=` on raw date strings.
- **Missing**: Number range filter, relative time filter ("last 30 days"), filter dependency (cascading filters)

---

## F29 — Filter Configuration Modal
- **Layer**: UI / API
- **Description**: Modal for creating/editing native filter configs. Fields: label, filter type (date_range / select / search), dataset selector, column selector (fetches columns from selected dataset), target chart selector (all or specific chart IDs). Saved via PUT `/api/dashboards/[id]/filters`.
- **Trigger**: Admin/alpha clicks "Add Filter" or "Edit Filter" in filter bar edit mode
- **Dependencies**: `components/filters/FilterConfigModal.tsx`, `app/api/dashboards/[id]/filters/`, `stores/filterStore.ts`
- **Edge Cases**: Zod validation on save. Column selector depends on dataset being selected first.
- **Missing**: Filter preview/test, multi-column compound filters

---

## F30 — Chart Auto-Refresh
- **Layer**: UI / API
- **Description**: Charts support configurable auto-refresh intervals: 0 (off), 10, 30, 60, 300 seconds. Interval set in Chart Builder. ChartPanel uses React Query `refetchInterval` to periodically re-fetch `/api/charts/[id]/data`. Cache TTL means fresh data every 5 minutes at minimum regardless of interval.
- **Trigger**: System (timer-based re-fetch)
- **Dependencies**: `components/dashboard/ChartPanel.tsx`, `@tanstack/react-query`, chart `config.autoRefreshInterval`
- **Edge Cases**: Cache may serve stale data within TTL window. Interval 0 = no auto-refresh.
- **Missing**: Dashboard-level global refresh override, refresh indicator spinner

---

## F31 — Dashboard Unsaved Changes Guard
- **Layer**: UI
- **Description**: Dashboard viewer tracks dirty state (unsaved changes). Shows "Discard" button in edit mode when dirty. Attaches `beforeunload` event to warn on tab close/navigation when dirty. Ctrl+S keyboard shortcut triggers save.
- **Trigger**: User modifies layout/filters and attempts to navigate away
- **Dependencies**: `app/(dashboard)/dashboards/[id]/page.tsx`, `stores/dashboard-store.ts`
- **Edge Cases**: Browser `beforeunload` confirmation. Discard reloads from saved state.
- **Missing**: Auto-save with conflict resolution

---

## F32 — Theme Toggle (Light / Dark)
- **Layer**: UI / System
- **Description**: Theme toggle button in sidebar. Switches between light and dark CSS variable sets. CodeMirror editor uses Compartment-based hot-swap for theme changes without remount. Persisted (likely localStorage via next-themes or equivalent).
- **Trigger**: User clicks theme toggle
- **Dependencies**: `components/ThemeToggle.tsx`, `components/sqllab/SqlEditor.tsx`, `tailwindcss`
- **Edge Cases**: CodeMirror uses `Compartment` to swap theme without destroying editor state.
- **Missing**: System theme detection (prefers-color-scheme), per-user theme persistence in DB

---

## F33 — Aggregation Engine (Client-Side Post-Processing)
- **Layer**: Data
- **Description**: `aggregateByLabel(rows, options)` in `lib/aggregation.ts` provides client-side post-processing: label normalization (case-insensitive merge), explicit label mapping (e.g., "USA" → "United States"), top-N + "Others" bucketing, aggregation functions (SUM, COUNT, AVG, MIN, MAX).
- **Trigger**: System (chart transformers calling aggregation after query)
- **Dependencies**: `lib/aggregation.ts`
- **Edge Cases**: Used in chart transformers, not in SQL generation. Complements server-side GROUP BY.
- **Missing**: Percentile aggregations, weighted averages

---

## F34 — Geo Chart (Geographic Visualization)
- **Layer**: UI / Data
- **Description**: `geo` vizType renders geographic scatter/heatmap/choropleth maps using ECharts. Config includes latitude, longitude, or region dimension columns.
- **Trigger**: User selects geo vizType in Chart Builder
- **Dependencies**: `components/charts/geo.tsx`, `echarts-for-react`, chart registry
- **Edge Cases**: Requires lat/lon columns or region name columns. No built-in geocoding.
- **Missing**: Tile layer selection, zoom controls, tooltip customization

---

## F35 — Pivot Table Chart
- **Layer**: UI / Data
- **Description**: `pivot_table` vizType renders cross-tabulation with configurable row dimensions, column dimensions, and metrics. Query uses `rows` and `columns` config fields (not standard GROUP BY flow).
- **Trigger**: User selects pivot_table vizType
- **Dependencies**: `components/charts/pivot-table.tsx`, `@tanstack/react-table`
- **Edge Cases**: No GROUP BY applied server-side for pivot_table (raw data returned, pivoting done client-side).
- **Missing**: Subtotals/totals rows, conditional formatting

---

## F36 — Big Number / KPI Charts
- **Layer**: UI / Data
- **Description**: Two KPI chart types: `big_number` (single metric + optional trend comparison) and `big_number_total` (single large number). Uses metric aggregation from dataset.
- **Trigger**: User selects big_number or big_number_total vizType
- **Dependencies**: `components/charts/big-number.tsx`, `components/charts/big-number-total.tsx`
- **Edge Cases**: Trend comparison requires time-based query with two periods.
- **Missing**: Sparkline trend visualization, goal/target line

---

## F37 — Sortable Data Table Chart
- **Layer**: UI
- **Description**: `table` vizType renders a sortable, paginated data table. Client-side sort via `@tanstack/react-table`. Columns auto-detected from query result.
- **Trigger**: User selects table vizType
- **Dependencies**: `components/charts/table-chart.tsx`, `@tanstack/react-table`
- **Edge Cases**: No server-side pagination (limited by MAX_QUERY_ROWS). No column formatting.
- **Missing**: Column type formatting (dates, numbers), conditional row highlighting, server-side pagination

---

## F38 — Chart Error Boundary + Retry
- **Layer**: UI
- **Description**: ChartPanel shows error state with retry button on fetch failure. Unknown vizType renders gracefully with "Unknown chart type" message. Loading state shows skeleton placeholder.
- **Trigger**: System (fetch failure, unknown vizType)
- **Dependencies**: `components/dashboard/ChartPanel.tsx`
- **Edge Cases**: Error message shown but raw DB error not exposed (server-side wrapping).
- **Missing**: Error reporting/telemetry, partial data render on timeout

---

## F39 — Public Chart Data with Authorization Check
- **Layer**: API / System
- **Description**: `/api/public/charts/[id]/data` verifies chart belongs to at least one published dashboard before serving data. Uses chart creator's userId for query history. Same filter param handling as authenticated endpoint. Redis cache with separate key prefix.
- **Trigger**: System (public dashboard chart render)
- **Dependencies**: `app/api/public/charts/[id]/data/route.ts`, `db/schema.ts` (dashboard_charts, dashboards), `lib/redis.ts`
- **Edge Cases**: Chart in multiple dashboards — only needs one to be published. Cache keyed separately from authenticated endpoint.
- **Missing**: Rate limiting for public endpoints

---

## F40 — Saved Metrics on Datasets
- **Layer**: Data / API
- **Description**: Datasets store a `metrics` JSON array (migration 0001): `[{ name, expression }]`. Chart builder references metrics by name. `buildChartQuery` resolves metric names to their SQL expressions (e.g., "Revenue" → "SUM(amount)").
- **Trigger**: System (query generation when metric name matches saved metric)
- **Dependencies**: `db/schema.ts` (datasets.metrics), `lib/chart-query.ts`
- **Edge Cases**: If metric name not found in dataset.metrics, falls back to raw expression.
- **Missing**: Metric configuration UI in dataset editor

---

## F41 — Column Metadata Storage and Refresh
- **Layer**: Data / API
- **Description**: Datasets store `columnMetadata` JSON (array of `{ name, type, description }`). Priority resolution on column fetch: (1) Redis cache, (2) stored columnMetadata, (3) live schema introspection for physical tables, (4) `SELECT ... LIMIT 0` execution for virtual datasets. Cleared on table/SQL change.
- **Trigger**: System (column selector in Chart Builder, FilterConfigModal)
- **Dependencies**: `app/api/datasets/[id]/columns/route.ts`, `lib/schema-introspector.ts`
- **Edge Cases**: Metadata can be stale if external schema changes. No UI to force refresh.
- **Missing**: Manual column metadata refresh button

---

## F42 — Health Check Endpoint
- **Layer**: API / System
- **Description**: GET `/api/health` returns `{ status: "ok" }`. No auth required. Used for load balancer / uptime checks.
- **Trigger**: System / infrastructure
- **Dependencies**: `app/api/health/route.ts`
- **Edge Cases**: Does not check DB or Redis connectivity — purely a process liveness check.
- **Missing**: Deep health check (DB connection, Redis ping, dependency status)

---
