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
CREATE TABLE `sandbox` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`visibility` text,
	`createdAt` integer,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sandbox_id_unique` ON `sandbox` (`id`);--> statement-breakpoint
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
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`image` text,
	`generations` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_id_unique` ON `user` (`id`);--> statement-breakpoint
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
CREATE TABLE `users_to_sandboxes` (
	`userId` text NOT NULL,
	`sandboxId` text NOT NULL,
	`sharedOn` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sandboxId`) REFERENCES `sandbox`(`id`) ON UPDATE no action ON DELETE no action
);
