ALTER TABLE `profiles` ADD `best_cloud_ms` integer;--> statement-breakpoint
ALTER TABLE `runs` ADD `course_id` text DEFAULT 'alpine-2000' NOT NULL;