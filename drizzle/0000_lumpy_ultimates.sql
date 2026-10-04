CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`price_cents` integer NOT NULL,
	`stock_status` text DEFAULT 'in_stock' NOT NULL,
	`image_url` text NOT NULL,
	`specs` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `products_category_price_idx` ON `products` (`category`,`price_cents`);