CREATE TABLE `poll_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`poll_id` integer NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `poll_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_token` text NOT NULL,
	`poll_id` integer NOT NULL,
	`selected_option_id` integer,
	`text_value` text,
	`rating_value` integer,
	`ranking_order` text,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selected_option_id`) REFERENCES `poll_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `poll_responses_voter_poll_idx` ON `poll_responses` (`voter_token`,`poll_id`);--> statement-breakpoint
CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`question` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`allow_multiple` integer DEFAULT false NOT NULL,
	`session_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`author_name` text,
	`is_approved` integer DEFAULT true NOT NULL,
	`is_highlighted` integer DEFAULT false NOT NULL,
	`is_answered` integer DEFAULT false NOT NULL,
	`session_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_token` text NOT NULL,
	`quiz_question_id` integer NOT NULL,
	`selected_option_id` integer,
	`answered_in_ms` integer DEFAULT 0 NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`quiz_question_id`) REFERENCES `quiz_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selected_option_id`) REFERENCES `quiz_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_answers_voter_question_idx` ON `quiz_answers` (`voter_token`,`quiz_question_id`);--> statement-breakpoint
CREATE TABLE `quiz_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`quiz_question_id` integer NOT NULL,
	FOREIGN KEY (`quiz_question_id`) REFERENCES `quiz_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`time_limit` integer DEFAULT 20 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`correct_option_id` integer,
	`quiz_id` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`current_question_index` integer DEFAULT -1 NOT NULL,
	`session_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`author_name` text NOT NULL,
	`question_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`is_moderated` integer DEFAULT false NOT NULL,
	`passcode_hash` text,
	`primary_color` text,
	`logo_url` text,
	`owner_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_code_unique` ON `sessions` (`code`);--> statement-breakpoint
CREATE TABLE `survey_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`survey_response_id` integer NOT NULL,
	`survey_question_id` integer NOT NULL,
	`selected_option_id` integer,
	`text_value` text,
	`rating_value` integer,
	FOREIGN KEY (`survey_response_id`) REFERENCES `survey_responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selected_option_id`) REFERENCES `survey_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `survey_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`survey_question_id` integer NOT NULL,
	FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `survey_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`survey_id` integer NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_token` text NOT NULL,
	`survey_id` integer NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_voter_survey_idx` ON `survey_responses` (`voter_token`,`survey_id`);--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`is_open` integer DEFAULT true NOT NULL,
	`session_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `upvotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_token` text NOT NULL,
	`question_id` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upvotes_voter_question_idx` ON `upvotes` (`voter_token`,`question_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);