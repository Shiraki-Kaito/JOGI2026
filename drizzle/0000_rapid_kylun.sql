CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`owned` text DEFAULT '[]' NOT NULL,
	`equipped` text DEFAULT 'none' NOT NULL,
	`best_ms` integer
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`user_id` text NOT NULL,
	`run_id` text NOT NULL,
	`coins` integer NOT NULL,
	`time_ms` integer NOT NULL,
	`claimed` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `run_id`)
);
