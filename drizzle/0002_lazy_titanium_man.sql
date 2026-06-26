CREATE TABLE `lead_release_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`releasedBy` int NOT NULL,
	`totalReleased` int NOT NULL,
	`filters` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_release_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `isReleasedToTeam` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `leads` ADD `releasedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `releasedBy` int;