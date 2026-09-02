CREATE TABLE `commerce_records` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`branch_id` text,
	`customer_email` text,
	`reference` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_records_reference_unique` ON `commerce_records` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_commerce_records_type_branch` ON `commerce_records` (`type`,`branch_id`);--> statement-breakpoint
CREATE INDEX `idx_commerce_records_customer` ON `commerce_records` (`customer_email`,`type`);--> statement-breakpoint
CREATE TABLE `customer_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`addresses_json` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_accounts_email_unique` ON `customer_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customer_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_sessions_token_unique` ON `customer_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_customer_sessions_user_expires` ON `customer_sessions` (`customer_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `product_details` (
	`product_id` text PRIMARY KEY NOT NULL,
	`specs_json` text DEFAULT '{}' NOT NULL,
	`warranty_months` integer DEFAULT 12 NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`barcode` text,
	`gpu_length_mm` integer,
	`case_gpu_clearance_mm` integer,
	`cooler_height_mm` integer,
	`case_cooler_clearance_mm` integer,
	`radiator_size_mm` integer,
	`case_radiator_support_mm` integer,
	`pcie_connectors` integer,
	`bios_version` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_fee` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `service_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `services_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `build_metadata` text DEFAULT '{}' NOT NULL;