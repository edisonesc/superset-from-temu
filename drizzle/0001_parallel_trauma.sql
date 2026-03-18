CREATE TABLE `charts` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`viz_type` varchar(64) NOT NULL,
	`dataset_id` varchar(128) NOT NULL,
	`config` json NOT NULL,
	`query_context` json,
	`created_by` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `charts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_charts` (
	`id` varchar(128) NOT NULL,
	`dashboard_id` varchar(128) NOT NULL,
	`chart_id` varchar(128) NOT NULL,
	`position` json,
	CONSTRAINT `dashboard_charts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`slug` varchar(255) NOT NULL,
	`layout` json,
	`filter_config` json,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_by` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboards_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboards_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `database_connections` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`dialect` enum('mysql','postgresql') NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL,
	`database_name` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`encrypted_password` text NOT NULL,
	`created_by` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `database_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`connection_id` varchar(128) NOT NULL,
	`table_name` varchar(255),
	`sql_definition` text,
	`column_metadata` json,
	`created_by` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `query_history` (
	`id` varchar(128) NOT NULL,
	`sql` text NOT NULL,
	`connection_id` varchar(128) NOT NULL,
	`executed_by` varchar(128) NOT NULL,
	`status` enum('success','error') NOT NULL,
	`row_count` int,
	`duration_ms` bigint,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `query_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_queries` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sql` text NOT NULL,
	`connection_id` varchar(128) NOT NULL,
	`created_by` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_queries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','alpha','gamma','public') NOT NULL DEFAULT 'gamma';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` ADD `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `charts` ADD CONSTRAINT `charts_dataset_id_datasets_id_fk` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `charts` ADD CONSTRAINT `charts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_charts` ADD CONSTRAINT `dashboard_charts_dashboard_id_dashboards_id_fk` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_charts` ADD CONSTRAINT `dashboard_charts_chart_id_charts_id_fk` FOREIGN KEY (`chart_id`) REFERENCES `charts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `database_connections` ADD CONSTRAINT `database_connections_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_connection_id_database_connections_id_fk` FOREIGN KEY (`connection_id`) REFERENCES `database_connections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `query_history` ADD CONSTRAINT `query_history_connection_id_database_connections_id_fk` FOREIGN KEY (`connection_id`) REFERENCES `database_connections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `query_history` ADD CONSTRAINT `query_history_executed_by_users_id_fk` FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_queries` ADD CONSTRAINT `saved_queries_connection_id_database_connections_id_fk` FOREIGN KEY (`connection_id`) REFERENCES `database_connections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_queries` ADD CONSTRAINT `saved_queries_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;