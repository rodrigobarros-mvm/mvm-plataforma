CREATE TABLE `lead_qualification_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`fieldId` int NOT NULL,
	`value` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_qualification_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualification_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(128) NOT NULL,
	`fieldKey` varchar(64) NOT NULL,
	`type` enum('text','number','select','multiselect','boolean','textarea') NOT NULL DEFAULT 'text',
	`required` boolean NOT NULL DEFAULT true,
	`active` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`options` text,
	`placeholder` varchar(256),
	`helpText` varchar(512),
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualification_fields_id` PRIMARY KEY(`id`),
	CONSTRAINT `qualification_fields_fieldKey_unique` UNIQUE(`fieldKey`)
);
