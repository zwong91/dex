CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tier` text DEFAULT 'free',
	`status` text DEFAULT 'active',
	`permissions` text NOT NULL,
	`rate_limit_per_hour` integer DEFAULT 1000,
	`rate_limit_per_day` integer DEFAULT 10000,
	`allowed_ips` text,
	`allowed_domains` text,
	`expires_at` integer,
	`last_used_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_status_idx` ON `api_keys` (`status`);--> statement-breakpoint
CREATE INDEX `api_keys_tier_idx` ON `api_keys` (`tier`);--> statement-breakpoint
CREATE INDEX `api_keys_expires_idx` ON `api_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_id` text NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`method` text NOT NULL,
	`status_code` integer NOT NULL,
	`response_time` integer,
	`request_size` integer,
	`response_size` integer,
	`user_agent` text,
	`ip_address` text,
	`chain` text,
	`error_message` text,
	`timestamp` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_usage_api_key_idx` ON `api_usage` (`api_key_id`);--> statement-breakpoint
CREATE INDEX `api_usage_user_idx` ON `api_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_usage_timestamp_idx` ON `api_usage` (`timestamp`);--> statement-breakpoint
CREATE INDEX `api_usage_date_idx` ON `api_usage` (`date`);--> statement-breakpoint
CREATE INDEX `api_usage_endpoint_idx` ON `api_usage` (`endpoint`);--> statement-breakpoint
CREATE INDEX `api_usage_status_idx` ON `api_usage` (`status_code`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`requested_tier` text,
	`requested_permissions` text,
	`reason` text NOT NULL,
	`use_case` text,
	`expected_volume` text,
	`status` text DEFAULT 'pending',
	`reviewed_by` text,
	`review_comment` text,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP,
	`reviewed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `applications_user_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `applications_type_idx` ON `applications` (`type`);--> statement-breakpoint
CREATE INDEX `applications_submitted_idx` ON `applications` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `daily_usage_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`api_key_id` text,
	`date` text NOT NULL,
	`total_requests` integer DEFAULT 0,
	`successful_requests` integer DEFAULT 0,
	`error_requests` integer DEFAULT 0,
	`total_response_time` integer DEFAULT 0,
	`avg_response_time` real,
	`total_data_transfer` integer DEFAULT 0,
	`unique_endpoints` integer DEFAULT 0,
	`peak_hour_usage` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_usage_user_date_idx` ON `daily_usage_summary` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `daily_usage_api_key_date_idx` ON `daily_usage_summary` (`api_key_id`,`date`);--> statement-breakpoint
CREATE INDEX `daily_usage_date_idx` ON `daily_usage_summary` (`date`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tier` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);--> statement-breakpoint
CREATE INDEX `permissions_name_idx` ON `permissions` (`name`);--> statement-breakpoint
CREATE INDEX `permissions_category_idx` ON `permissions` (`category`);--> statement-breakpoint
CREATE INDEX `permissions_tier_idx` ON `permissions` (`tier`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tier` text NOT NULL,
	`status` text DEFAULT 'active',
	`billing_cycle` text,
	`price_per_month` real,
	`currency` text DEFAULT 'USD',
	`payment_method` text,
	`stripe_subscription_id` text,
	`trial_ends_at` integer,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancelled_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_tier_idx` ON `subscriptions` (`tier`);--> statement-breakpoint
CREATE INDEX `subscriptions_stripe_idx` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text,
	`name` text,
	`avatar` text,
	`company` text,
	`website` text,
	`bio` text,
	`wallet_address` text,
	`status` text DEFAULT 'pending',
	`email_verified` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_wallet_idx` ON `users` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
DROP TABLE `sandbox`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
DROP TABLE `users_to_sandboxes`;