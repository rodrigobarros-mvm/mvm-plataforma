CREATE TABLE `commission_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`valuePerQualifiedLead` decimal(10,2) NOT NULL DEFAULT '0',
	`percentageOfTicket` decimal(5,2) DEFAULT '0',
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commission_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`leadId` int,
	`valuePerLead` decimal(10,2) NOT NULL,
	`ticketValue` decimal(12,2),
	`percentageOfTicket` decimal(5,2),
	`status` enum('pendente','aprovado','pago') NOT NULL DEFAULT 'pendente',
	`paidAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(16) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('leads_qualificados','tentativas_contato','conversao') NOT NULL,
	`targetValue` int NOT NULL,
	`period` enum('diario','semanal','mensal') NOT NULL,
	`startDate` varchar(16) NOT NULL,
	`endDate` varchar(16),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyContactAttempts` int NOT NULL DEFAULT 80,
	`dailyQualifiedLeads` int NOT NULL DEFAULT 5,
	`conversionRateTarget` decimal(5,2) DEFAULT '6.25',
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('contato','qualificacao','desqualificacao','observacao','tentativa') NOT NULL,
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prioridade` varchar(32),
	`classificacao` varchar(64),
	`nomeFantasia` varchar(256),
	`razaoSocial` varchar(512),
	`cnpj` varchar(32),
	`segmento` varchar(128),
	`uf` varchar(4),
	`cidade` varchar(128),
	`enderecoCompleto` text,
	`whatsapp1` varchar(64),
	`whatsapp2` varchar(64),
	`email` varchar(320),
	`linkedinGerente` text,
	`linkedinDiretor` text,
	`linkedinCeo` text,
	`googleMaps` text,
	`nomeDecissor` varchar(256),
	`conheceMarca` varchar(64),
	`frotaAtual` varchar(128),
	`creditoFormaPagamento` varchar(256),
	`urgenciaCompra` varchar(128),
	`desafioPrincipal` text,
	`statusContato` varchar(64) DEFAULT 'Não iniciado',
	`dataContato` varchar(32),
	`linkCrm` text,
	`observacoes` text,
	`scriptAbertura` text,
	`scriptParceria` text,
	`scriptTecnico` text,
	`isQualified` boolean DEFAULT false,
	`qualifiedAt` timestamp,
	`qualifiedBy` int,
	`disqualifiedReason` text,
	`disqualifiedAt` timestamp,
	`disqualifiedBy` int,
	`isHighPriority` boolean DEFAULT false,
	`isHidden` boolean DEFAULT false,
	`assignedTo` int,
	`modeloEmpilhadeira` varchar(128),
	`ticketEstimado` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedLeadId` int,
	`relatedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('adm','gerente','bdr') NOT NULL,
	`token` varchar(128) NOT NULL,
	`invitedBy` int NOT NULL,
	`usedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','adm','gerente','bdr') NOT NULL DEFAULT 'bdr';--> statement-breakpoint
ALTER TABLE `users` ADD `lastName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `cargo` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `whatsapp` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isBlocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `resetToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `resetTokenExpiry` timestamp;--> statement-breakpoint
CREATE INDEX `uf_idx` ON `leads` (`uf`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `leads` (`statusContato`);--> statement-breakpoint
CREATE INDEX `priority_idx` ON `leads` (`isHighPriority`);--> statement-breakpoint
CREATE INDEX `assigned_idx` ON `leads` (`assignedTo`);