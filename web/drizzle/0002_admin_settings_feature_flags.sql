CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `polls_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `quizzes_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `replies_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `surveys_enabled` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `votes_enabled` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `saturday_banner_enabled` integer DEFAULT 1 NOT NULL;
