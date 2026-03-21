# Onboarding Guide

## 1. Project Overview

A self-hosted Apache Superset-style BI platform built from scratch with Next.js 16 (App Router). Users connect to MySQL/PostgreSQL databases, build charts from datasets, compose them into dashboards, and share dashboards publicly. The "DIY" framing means the entire feature set — SQL Lab, Chart Builder, Dashboard Engine — lives in this single Next.js monorepo.

---

## 2. High-Level Architecture

```
Browser
  └── Next.js App (app/)
        ├── (dashboard)/*  — protected UI (server + client components)
        ├── api/*          — REST API routes (Next.js Route Handlers)
        └── public/*       — unauthenticated public dashboard views

Server-side services (lib/)
  ├── auth.ts             — NextAuth v5 JWT session
  ├── query-runner.ts     — executes SQL against user DBs (mysql2 / pg)
  ├── chart-query.ts      — translates chart config → SQL → cached data
  ├── schema-introspector.ts — live DB schema inspection
  ├── redis.ts            — result cache + schema cache (ioredis)
  └── crypto.ts           — AES-256-GCM for stored DB passwords

Persistence
  ├── MySQL (metadata DB) — managed via Drizzle ORM (db/schema.ts)
  └── Redis              — query result cache, schema cache
```

Data flow: UI → `app/api/*` route → `lib/query-runner.ts` (fetches + decrypts credentials from metadata DB) → user's target DB → Redis cache → response.

---

## 3. Key Directories

| Path | What it is | Go here when... |
|---|---|---|
| [db/schema.ts](db/schema.ts) | All Drizzle table definitions + inferred TS types | Adding/changing any DB column |
| [lib/](lib/) | All server-side business logic | Touching auth, query execution, caching, crypto |
| [app/api/](app/api/) | Every REST endpoint | Adding/changing API behavior |
| [components/charts/](components/charts/) | 10 chart implementations + registry | Adding a new chart type or fixing a chart bug |
| [stores/](stores/) | Zustand v5 client state (SQL Lab, Dashboard) | Changing client-side state shape |
| [types/index.ts](types/index.ts) | All shared TS types | Adding a new type used across files |
| [lib/constants.ts](lib/constants.ts) | `MAX_QUERY_ROWS`, `DEFAULT_PAGE_SIZE`, roles, dialects | Changing any global limit/enum |

---

## 4. First Places to Read (in order)

1. [db/schema.ts](db/schema.ts) — understand the 8-table data model
2. [types/index.ts](types/index.ts) — understand shared types (`ApiResponse<T>`, `ChartConfig`, `FilterContext`)
3. [lib/auth.ts](lib/auth.ts) + [auth.config.ts](auth.config.ts) — roles: `admin > alpha > gamma > public`
4. [lib/query-runner.ts](lib/query-runner.ts) — the security-critical SQL execution path
5. [components/charts/registry.ts](components/charts/registry.ts) — how chart types are registered and discovered

---

## 5. Common Workflows

**UI change** → edit the relevant page in [app/(dashboard)/](app/(dashboard)/) or component in [components/](components/). Most pages are server components; interactive pieces are `'use client'`.

**API change** → edit the route file in [app/api/](app/api/). Every route follows `ApiResponse<T>` shape. Add Zod v4 validation for any new body params.

**Schema change** → edit [db/schema.ts](db/schema.ts), then run:
```bash
npx dotenv -e .env.local -- npx drizzle-kit generate
npx dotenv -e .env.local -- npx drizzle-kit migrate
```

**New chart type** → create `components/charts/[vizType].tsx` (export component, transformer, configSchema, defaultConfig), then register it in [components/charts/registry.ts](components/charts/registry.ts).

---

## 6. Gotchas

- **Two auth configs**: `lib/auth.ts` (full, uses DB) and `auth.config.ts` (Edge-safe, no DB/Redis). Middleware uses only `auth.config.ts` — do not import DB or Redis there.
- **Passwords never leave the server**: `encrypted_password` is AES-256-GCM encrypted in the metadata DB. `query-runner.ts` decrypts it server-side. API responses always omit it.
- **`MAX_QUERY_ROWS` is enforced automatically**: `query-runner.ts` appends `LIMIT 10000` if missing — don't bypass this.
- **Redis cache invalidation is manual**: chart data is cached by `chart:{id}:{filterHash}`. If you change how `buildChartQuery` works, old cache keys won't auto-expire for 5 minutes.
- **Tailwind v4**: no `tailwind.config.js`. Config lives entirely in [app/globals.css](app/globals.css) via `@import "tailwindcss"`.
- **`x-pathname` header**: middleware injects the current path so server components can highlight the active sidebar link — read from `headers()` in [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx).

---

## 7. Styling System

All colours and typography tokens are centralized. **Never hardcode hex values or `rgba()` strings directly in components.**

### Two files, one rule

| Context | File | Format |
|---|---|---|
| CSS / Tailwind / inline `style={{}}` | [app/globals.css](app/globals.css) | `var(--token-name)` |
| ECharts options / CodeMirror themes | [lib/theme.ts](lib/theme.ts) | imported JS constant |

ECharts and CodeMirror require resolved hex strings at construction time and cannot consume CSS variables. `lib/theme.ts` bridges this gap — every constant maps 1-to-1 to a CSS variable in `globals.css`. Both files must be kept in sync when changing a colour.

### Token groups (`app/globals.css`)

```
Backgrounds       --bg-base · --bg-surface · --bg-elevated · --bg-border · --bg-hover
Accent            --accent · --accent-bright · --accent-deep · --accent-cyan
Accent opacity    --accent-10 · --accent-15
Text              --text-primary · --text-secondary · --text-muted
Semantic          --success · --warning · --error · --info
Error opacity     --error-bg · --error-border
Chart palette     --chart-1 … --chart-7
Heatmap gradient  --heatmap-0 … --heatmap-4
Neutrals          --slate-400 · --slate-900 · --gray-300
Login overlays    --login-bg · --login-card-bg · --login-card-border
                  --login-text-dim · --login-footer-text
Fonts             --font-geist-sans · --font-geist-mono  (set by next/font in layout.tsx)
```

### JS constants (`lib/theme.ts`)

```ts
CHART_COLORS          // 7-colour categorical array  →  --chart-1 … --chart-7
SCATTER_COLORS        // 5-colour blue-anchored array
HEATMAP_GRADIENT      // 5-step sequential cyan      →  --heatmap-0 … --heatmap-4
TEXT_COLOR            // →  --text-muted
SPLIT_LINE_COLOR      // →  --bg-hover
AXIS_LINE_COLOR       // →  --bg-border
AXIS_POINTER_COLOR    // →  --slate-900
TOOLTIP_STYLE         // drop-in ECharts tooltip object
PIE_LABEL_COLOR       // →  --text-secondary
PIE_LABEL_LINE_COLOR  // →  --gray-300
SCATTER_EMPHASIS_SHADOW
HEATMAP_TOOLTIP_DIM   // →  --slate-400
EDITOR_*              // 12 CodeMirror/SqlEditor constants
```

### How to change a colour

1. Update the hex in `app/globals.css`
2. Update the matching constant in `lib/theme.ts`
3. No component files need touching

### Usage examples

**Component (CSS context):**
```tsx
<div style={{ color: "var(--text-secondary)", background: "var(--bg-surface)" }} />
```

**ECharts option (JS context):**
```ts
import { CHART_COLORS, TOOLTIP_STYLE, TEXT_COLOR } from "@/lib/theme";

const option = {
  color: CHART_COLORS,
  tooltip: { trigger: "axis", ...TOOLTIP_STYLE },
  xAxis: { axisLabel: { color: TEXT_COLOR } },
};
```

**New chart component — one import covers the full shared surface:**
```ts
import { CHART_COLORS, TEXT_COLOR, AXIS_LINE_COLOR, SPLIT_LINE_COLOR, TOOLTIP_STYLE } from "@/lib/theme";
```
