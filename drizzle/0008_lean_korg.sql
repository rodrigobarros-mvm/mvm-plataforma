CREATE TABLE `lead_assignment_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`action` enum('assigned','unassigned') NOT NULL,
	`byUserId` int NOT NULL,
	`toUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_assignment_log_id` PRIMARY KEY(`id`)
);
