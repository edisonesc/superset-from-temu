import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  json,
  boolean,
  int,
  bigint,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

/**
 * Application users. Role drives all RBAC checks across the app.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "alpha", "gamma", "public"])
    .notNull()
    .default("gamma"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// database_connections
// ---------------------------------------------------------------------------

/**
 * User-managed external data source connections.
 * Passwords are stored AES-256-GCM encrypted via lib/crypto.ts.
 */
export const databaseConnections = mysqlTable("database_connections", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dialect: mysqlEnum("dialect", ["mysql", "postgresql"]).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull(),
  databaseName: varchar("database_name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  createdBy: varchar("created_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type NewDatabaseConnection = typeof databaseConnections.$inferInsert;

// ---------------------------------------------------------------------------
// datasets
// ---------------------------------------------------------------------------

/**
 * Logical datasets backed by a database connection.
 * Can be a physical table (table_name) or a virtual dataset (sql_definition).
 */
export const datasets = mysqlTable("datasets", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  connectionId: varchar("connection_id", { length: 128 })
    .notNull()
    .references(() => databaseConnections.id),
  tableName: varchar("table_name", { length: 255 }),
  /** Raw SQL for virtual/computed datasets; null for physical tables. */
  sqlDefinition: text("sql_definition"),
  /** JSON array of { name, type, description } column descriptors. */
  columnMetadata: json("column_metadata"),
  createdBy: varchar("created_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;

// ---------------------------------------------------------------------------
// charts
// ---------------------------------------------------------------------------

/**
 * Saved chart definitions. config holds viz-type-specific options;
 * query_context holds the serialised query parameters.
 */
export const charts = mysqlTable("charts", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  vizType: varchar("viz_type", { length: 64 }).notNull(),
  datasetId: varchar("dataset_id", { length: 128 })
    .notNull()
    .references(() => datasets.id),
  /** Viz-type-specific configuration (axes, colours, aggregations, etc.). */
  config: json("config").notNull(),
  /** Serialised query context used to reproduce the chart's data fetch. */
  queryContext: json("query_context"),
  createdBy: varchar("created_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Chart = typeof charts.$inferSelect;
export type NewChart = typeof charts.$inferInsert;

// ---------------------------------------------------------------------------
// dashboards
// ---------------------------------------------------------------------------

/**
 * Dashboard definitions. layout is the dnd-kit serialised grid state;
 * filter_config holds cross-filter rules.
 */
export const dashboards = mysqlTable("dashboards", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  /** Serialised dnd-kit grid layout. */
  layout: json("layout"),
  /** Cross-filter configuration. */
  filterConfig: json("filter_config"),
  isPublished: boolean("is_published").notNull().default(false),
  createdBy: varchar("created_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;

// ---------------------------------------------------------------------------
// dashboard_charts  (join table)
// ---------------------------------------------------------------------------

/**
 * Many-to-many relationship between dashboards and charts.
 * position stores the chart's placement within the dashboard grid.
 */
export const dashboardCharts = mysqlTable("dashboard_charts", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  dashboardId: varchar("dashboard_id", { length: 128 })
    .notNull()
    .references(() => dashboards.id),
  chartId: varchar("chart_id", { length: 128 })
    .notNull()
    .references(() => charts.id),
  /** dnd-kit position descriptor (x, y, w, h, etc.). */
  position: json("position"),
});

export type DashboardChart = typeof dashboardCharts.$inferSelect;
export type NewDashboardChart = typeof dashboardCharts.$inferInsert;

// ---------------------------------------------------------------------------
// saved_queries
// ---------------------------------------------------------------------------

/**
 * SQL Lab queries saved by users for future reuse.
 */
export const savedQueries = mysqlTable("saved_queries", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sql: text("sql").notNull(),
  connectionId: varchar("connection_id", { length: 128 })
    .notNull()
    .references(() => databaseConnections.id),
  createdBy: varchar("created_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SavedQuery = typeof savedQueries.$inferSelect;
export type NewSavedQuery = typeof savedQueries.$inferInsert;

// ---------------------------------------------------------------------------
// query_history
// ---------------------------------------------------------------------------

/**
 * Immutable audit log of every SQL execution in SQL Lab.
 * No updated_at — rows are never modified after insert.
 */
export const queryHistory = mysqlTable("query_history", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  sql: text("sql").notNull(),
  connectionId: varchar("connection_id", { length: 128 })
    .notNull()
    .references(() => databaseConnections.id),
  executedBy: varchar("executed_by", { length: 128 })
    .notNull()
    .references(() => users.id),
  status: mysqlEnum("status", ["success", "error"]).notNull(),
  rowCount: int("row_count"),
  durationMs: bigint("duration_ms", { mode: "number" }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QueryHistory = typeof queryHistory.$inferSelect;
export type NewQueryHistory = typeof queryHistory.$inferInsert;
