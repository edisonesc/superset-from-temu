CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL DEFAULT ('viewer'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
