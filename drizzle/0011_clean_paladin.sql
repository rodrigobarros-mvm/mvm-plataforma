ALTER TABLE `leads` ADD `logradouro` varchar(256);--> statement-breakpoint
ALTER TABLE `leads` ADD `numero` varchar(32);--> statement-breakpoint
ALTER TABLE `leads` ADD `complemento` varchar(128);--> statement-breakpoint
ALTER TABLE `leads` ADD `bairro` varchar(128);--> statement-breakpoint
ALTER TABLE `leads` ADD `capitalSocial` varchar(64);--> statement-breakpoint
ALTER TABLE `leads` ADD `matrizFilial` varchar(32);--> statement-breakpoint
ALTER TABLE `leads` ADD `socios` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `cnae` varchar(128);