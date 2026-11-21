CREATE TABLE `benchmark_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`scenario` text NOT NULL,
	`resolution` text,
	`avg_fps` integer NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `benchmark_slug_idx` ON `benchmark_data` (`slug`);--> statement-breakpoint
CREATE INDEX `benchmark_lookup_idx` ON `benchmark_data` (`kind`,`scenario`,`resolution`);