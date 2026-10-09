CREATE TABLE `discounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`value` integer NOT NULL,
	`min_subtotal_cents` integer DEFAULT 0 NOT NULL,
	`max_redemptions` integer,
	`times_used` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discounts_code_unique` ON `discounts` (`code`);--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_redeemed` integer DEFAULT false NOT NULL;