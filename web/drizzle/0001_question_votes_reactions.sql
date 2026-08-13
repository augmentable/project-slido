ALTER TABLE `questions` ADD COLUMN `title` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `upvotes` ADD COLUMN `value` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE TABLE `question_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_token` text NOT NULL,
	`question_id` integer NOT NULL,
	`emoji` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_reactions_voter_question_emoji_idx` ON `question_reactions` (`voter_token`,`question_id`,`emoji`);
