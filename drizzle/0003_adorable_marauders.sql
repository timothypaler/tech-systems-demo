CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`order_number` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_order_created` ON `notifications` (`order_number`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_reference` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_details` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `paid_at` text;