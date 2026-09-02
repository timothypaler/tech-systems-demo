ALTER TABLE `products` ADD `image_key` text;--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_branch_created` ON `orders` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_branch_created` ON `stock_movements` (`branch_id`,`created_at`);