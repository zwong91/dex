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
CREATE TABLE `liquidity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tx_hash` text NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`user` text NOT NULL,
	`event_type` text NOT NULL,
	`bin_ids` text NOT NULL,
	`amounts` text NOT NULL,
	`liquidity` text NOT NULL,
	`liquidity_usd` real,
	`block_number` integer NOT NULL,
	`log_index` integer NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `liquidity_events_tx_hash_idx` ON `liquidity_events` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `liquidity_events_pool_idx` ON `liquidity_events` (`pool_address`);--> statement-breakpoint
CREATE INDEX `liquidity_events_user_idx` ON `liquidity_events` (`user`);--> statement-breakpoint
CREATE INDEX `liquidity_events_timestamp_idx` ON `liquidity_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `liquidity_events_type_idx` ON `liquidity_events` (`event_type`);--> statement-breakpoint
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
CREATE TABLE `pool_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`reserve_x` text NOT NULL,
	`reserve_y` text NOT NULL,
	`active_bin_id` integer NOT NULL,
	`total_supply` text NOT NULL,
	`liquidity_usd` real,
	`volume_24h` real,
	`volume_7d` real,
	`fees_24h` real,
	`apy` real,
	`block_number` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pool_stats_pool_idx` ON `pool_stats` (`pool_address`);--> statement-breakpoint
CREATE INDEX `pool_stats_timestamp_idx` ON `pool_stats` (`timestamp`);--> statement-breakpoint
CREATE INDEX `pool_stats_block_idx` ON `pool_stats` (`block_number`);--> statement-breakpoint
CREATE TABLE `pools` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`chain` text NOT NULL,
	`token_x` text NOT NULL,
	`token_y` text NOT NULL,
	`bin_step` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active',
	`version` text DEFAULT 'v2.2',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pools_address_unique` ON `pools` (`address`);--> statement-breakpoint
CREATE INDEX `pools_chain_idx` ON `pools` (`chain`);--> statement-breakpoint
CREATE INDEX `pools_address_idx` ON `pools` (`address`);--> statement-breakpoint
CREATE INDEX `pools_tokens_idx` ON `pools` (`token_x`,`token_y`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`token_address` text NOT NULL,
	`chain` text NOT NULL,
	`price_usd` real NOT NULL,
	`volume_24h` real,
	`market_cap` real,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `price_history_token_chain_idx` ON `price_history` (`token_address`,`chain`);--> statement-breakpoint
CREATE INDEX `price_history_timestamp_idx` ON `price_history` (`timestamp`);--> statement-breakpoint
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
CREATE TABLE `swap_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tx_hash` text NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`sender` text NOT NULL,
	`to` text NOT NULL,
	`token_in_address` text NOT NULL,
	`token_out_address` text NOT NULL,
	`amount_in` text NOT NULL,
	`amount_out` text NOT NULL,
	`amount_in_usd` real,
	`amount_out_usd` real,
	`fees` text,
	`fees_usd` real,
	`block_number` integer NOT NULL,
	`log_index` integer NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `swap_events_tx_hash_idx` ON `swap_events` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `swap_events_pool_idx` ON `swap_events` (`pool_address`);--> statement-breakpoint
CREATE INDEX `swap_events_sender_idx` ON `swap_events` (`sender`);--> statement-breakpoint
CREATE INDEX `swap_events_timestamp_idx` ON `swap_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `swap_events_block_log_idx` ON `swap_events` (`block_number`,`log_index`);--> statement-breakpoint
CREATE TABLE `sync_status` (
	`id` text PRIMARY KEY NOT NULL,
	`chain` text NOT NULL,
	`contract_address` text NOT NULL,
	`event_type` text NOT NULL,
	`last_block_number` integer NOT NULL,
	`last_log_index` integer NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `sync_status_chain_contract_idx` ON `sync_status` (`chain`,`contract_address`);--> statement-breakpoint
CREATE TABLE `tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`chain` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`decimals` integer NOT NULL,
	`logo_uri` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `tokens_address_chain_idx` ON `tokens` (`address`,`chain`);--> statement-breakpoint
CREATE INDEX `tokens_symbol_idx` ON `tokens` (`symbol`);--> statement-breakpoint
CREATE TABLE `user_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`bin_id` integer NOT NULL,
	`liquidity` text NOT NULL,
	`liquidity_usd` real,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_positions_user_pool_idx` ON `user_positions` (`user_address`,`pool_address`);--> statement-breakpoint
CREATE INDEX `user_positions_user_idx` ON `user_positions` (`user_address`);--> statement-breakpoint
CREATE INDEX `user_positions_pool_bin_idx` ON `user_positions` (`pool_address`,`bin_id`);--> statement-breakpoint
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
CREATE INDEX `users_status_idx` ON `users` (`status`);