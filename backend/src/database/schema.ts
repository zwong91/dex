import { integer, sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { relations, sql } from "drizzle-orm";

// DEX Related Tables

// 流动性池表
export const pools = sqliteTable("pools", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	address: text("address").notNull().unique(),
	chain: text("chain").notNull(),
	tokenX: text("token_x").notNull(),
	tokenY: text("token_y").notNull(),
	binStep: integer("bin_step").notNull(),
	name: text("name").notNull(),
	status: text("status").default("active"),
	version: text("version").default("v2.2"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("pools_chain_idx").on(table.chain),
	index("pools_address_idx").on(table.address),
	index("pools_tokens_idx").on(table.tokenX, table.tokenY),
]);

// 代币表
export const tokens = sqliteTable("tokens", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	address: text("address").notNull(),
	chain: text("chain").notNull(),
	name: text("name").notNull(),
	symbol: text("symbol").notNull(),
	decimals: integer("decimals").notNull(),
	logoURI: text("logo_uri"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("tokens_address_chain_idx").on(table.address, table.chain),
	index("tokens_symbol_idx").on(table.symbol),
]);

// 池统计表（实时更新）
export const poolStats = sqliteTable("pool_stats", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	reserveX: text("reserve_x").notNull(), // 使用text存储大数值
	reserveY: text("reserve_y").notNull(),
	activeBinId: integer("active_bin_id").notNull(),
	totalSupply: text("total_supply").notNull(),
	liquidityUsd: real("liquidity_usd"),
	volume24h: real("volume_24h"),
	volume7d: real("volume_7d"),
	fees24h: real("fees_24h"),
	apy: real("apy"),
	blockNumber: integer("block_number").notNull(),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("pool_stats_pool_idx").on(table.poolAddress),
	index("pool_stats_timestamp_idx").on(table.timestamp),
	index("pool_stats_block_idx").on(table.blockNumber),
]);

// 交易事件表
export const swapEvents = sqliteTable("swap_events", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	txHash: text("tx_hash").notNull(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	sender: text("sender").notNull(),
	to: text("to").notNull(),
	tokenInAddress: text("token_in_address").notNull(),
	tokenOutAddress: text("token_out_address").notNull(),
	amountIn: text("amount_in").notNull(),
	amountOut: text("amount_out").notNull(),
	amountInUsd: real("amount_in_usd"),
	amountOutUsd: real("amount_out_usd"),
	fees: text("fees"),
	feesUsd: real("fees_usd"),
	blockNumber: integer("block_number").notNull(),
	logIndex: integer("log_index").notNull(),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
	index("swap_events_tx_hash_idx").on(table.txHash),
	index("swap_events_pool_idx").on(table.poolAddress),
	index("swap_events_sender_idx").on(table.sender),
	index("swap_events_timestamp_idx").on(table.timestamp),
	index("swap_events_block_log_idx").on(table.blockNumber, table.logIndex),
]);

// 流动性事件表
export const liquidityEvents = sqliteTable("liquidity_events", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	txHash: text("tx_hash").notNull(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	user: text("user").notNull(),
	eventType: text("event_type").notNull(), // 'deposit' | 'withdraw'
	binIds: text("bin_ids").notNull(), // JSON array of bin IDs
	amounts: text("amounts").notNull(), // JSON array of amounts
	liquidity: text("liquidity").notNull(),
	liquidityUsd: real("liquidity_usd"),
	blockNumber: integer("block_number").notNull(),
	logIndex: integer("log_index").notNull(),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
	index("liquidity_events_tx_hash_idx").on(table.txHash),
	index("liquidity_events_pool_idx").on(table.poolAddress),
	index("liquidity_events_user_idx").on(table.user),
	index("liquidity_events_timestamp_idx").on(table.timestamp),
	index("liquidity_events_type_idx").on(table.eventType),
]);

// 用户流动性仓位表
export const userPositions = sqliteTable("user_positions", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userAddress: text("user_address").notNull(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	binId: integer("bin_id").notNull(),
	liquidity: text("liquidity").notNull(),
	liquidityUsd: real("liquidity_usd"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("user_positions_user_pool_idx").on(table.userAddress, table.poolAddress),
	index("user_positions_user_idx").on(table.userAddress),
	index("user_positions_pool_bin_idx").on(table.poolAddress, table.binId),
]);

// 价格历史表
export const priceHistory = sqliteTable("price_history", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	tokenAddress: text("token_address").notNull(),
	chain: text("chain").notNull(),
	priceUsd: real("price_usd").notNull(),
	volume24h: real("volume_24h"),
	marketCap: real("market_cap"),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
	index("price_history_token_chain_idx").on(table.tokenAddress, table.chain),
	index("price_history_timestamp_idx").on(table.timestamp),
]);

// 事件处理状态表（用于跟踪同步进度）
export const syncStatus = sqliteTable("sync_status", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	chain: text("chain").notNull(),
	contractAddress: text("contract_address").notNull(),
	eventType: text("event_type").notNull(),
	lastBlockNumber: integer("last_block_number").notNull(),
	lastLogIndex: integer("last_log_index").notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("sync_status_chain_contract_idx").on(table.chain, table.contractAddress),
]);

// Relations
export const poolsRelations = relations(pools, ({ many, one }) => ({
	stats: many(poolStats),
	swapEvents: many(swapEvents),
	liquidityEvents: many(liquidityEvents),
	userPositions: many(userPositions),
	tokenX: one(tokens, {
		fields: [pools.tokenX],
		references: [tokens.address],
	}),
	tokenY: one(tokens, {
		fields: [pools.tokenY],
		references: [tokens.address],
	}),
}));

export const tokensRelations = relations(tokens, ({ many }) => ({
	priceHistory: many(priceHistory),
	poolsAsTokenX: many(pools, { relationName: "tokenX" }),
	poolsAsTokenY: many(pools, { relationName: "tokenY" }),
}));

export const poolStatsRelations = relations(poolStats, ({ one }) => ({
	pool: one(pools, {
		fields: [poolStats.poolAddress],
		references: [pools.address],
	}),
}));

export const swapEventsRelations = relations(swapEvents, ({ one }) => ({
	pool: one(pools, {
		fields: [swapEvents.poolAddress],
		references: [pools.address],
	}),
}));

export const liquidityEventsRelations = relations(liquidityEvents, ({ one }) => ({
	pool: one(pools, {
		fields: [liquidityEvents.poolAddress],
		references: [pools.address],
	}),
}));

export const userPositionsRelations = relations(userPositions, ({ one }) => ({
	pool: one(pools, {
		fields: [userPositions.poolAddress],
		references: [pools.address],
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
	token: one(tokens, {
		fields: [priceHistory.tokenAddress],
		references: [tokens.address],
	}),
}));

// Types
export type Pool = typeof pools.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type PoolStats = typeof poolStats.$inferSelect;
export type SwapEvent = typeof swapEvents.$inferSelect;
export type LiquidityEvent = typeof liquidityEvents.$inferSelect;
export type UserPosition = typeof userPositions.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type SyncStatus = typeof syncStatus.$inferSelect;

// User Account & API Management System

// 用户账户表
export const users = sqliteTable("users", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	email: text("email").notNull().unique(),
	username: text("username").unique(),
	name: text("name"),
	avatar: text("avatar"),
	company: text("company"),
	website: text("website"),
	bio: text("bio"),
	walletAddress: text("wallet_address"), // 可选的钱包地址绑定
	status: text("status", { enum: ["active", "suspended", "pending"] }).default("pending"),
	emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
}, (table) => [
	index("users_email_idx").on(table.email),
	index("users_username_idx").on(table.username),
	index("users_wallet_idx").on(table.walletAddress),
	index("users_status_idx").on(table.status),
]);

// API密钥表
export const apiKeys = sqliteTable("api_keys", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	keyHash: text("key_hash").notNull().unique(), // 存储API密钥的哈希值
	keyPrefix: text("key_prefix").notNull(), // 存储密钥前缀用于显示 (如: "dex_xxx...")
	name: text("name").notNull(), // 用户自定义的密钥名称
	description: text("description"), // 密钥用途描述
	tier: text("tier", { enum: ["free", "basic", "pro", "enterprise"] }).default("free"),
	status: text("status", { enum: ["active", "suspended", "revoked"] }).default("active"),
	permissions: text("permissions").notNull(), // JSON数组，存储权限列表
	rateLimitPerHour: integer("rate_limit_per_hour").default(1000), // 每小时请求限制
	rateLimitPerDay: integer("rate_limit_per_day").default(10000), // 每日请求限制
	allowedIps: text("allowed_ips"), // JSON数组，允许的IP地址
	allowedDomains: text("allowed_domains"), // JSON数组，允许的域名
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }), // 过期时间，null表示永不过期
	lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("api_keys_user_idx").on(table.userId),
	index("api_keys_hash_idx").on(table.keyHash),
	index("api_keys_status_idx").on(table.status),
	index("api_keys_tier_idx").on(table.tier),
	index("api_keys_expires_idx").on(table.expiresAt),
]);

// API使用统计表
export const apiUsage = sqliteTable("api_usage", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	endpoint: text("endpoint").notNull(), // 请求的端点
	method: text("method").notNull(), // HTTP方法
	statusCode: integer("status_code").notNull(), // 响应状态码
	responseTime: integer("response_time"), // 响应时间(毫秒)
	requestSize: integer("request_size"), // 请求大小(字节)
	responseSize: integer("response_size"), // 响应大小(字节)
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	chain: text("chain"), // 请求的区块链网络
	errorMessage: text("error_message"), // 错误信息(如果有)
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
	date: text("date").notNull(), // YYYY-MM-DD格式，用于按日期聚合
}, (table) => [
	index("api_usage_api_key_idx").on(table.apiKeyId),
	index("api_usage_user_idx").on(table.userId),
	index("api_usage_timestamp_idx").on(table.timestamp),
	index("api_usage_date_idx").on(table.date),
	index("api_usage_endpoint_idx").on(table.endpoint),
	index("api_usage_status_idx").on(table.statusCode),
]);

// 权限定义表
export const permissions = sqliteTable("permissions", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	name: text("name").notNull().unique(), // 权限名称，如: "dex:pools:read"
	description: text("description").notNull(),
	category: text("category").notNull(), // 权限分类，如: "dex", "admin", "analytics"
	tier: text("tier", { enum: ["free", "basic", "pro", "enterprise"] }).notNull(), // 需要的最低tier
	isActive: integer("is_active", { mode: "boolean" }).default(true),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("permissions_name_idx").on(table.name),
	index("permissions_category_idx").on(table.category),
	index("permissions_tier_idx").on(table.tier),
]);

// 用户申请记录表（API密钥申请）
export const applications = sqliteTable("applications", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["api_key", "tier_upgrade", "permission_request"] }).notNull(),
	requestedTier: text("requested_tier", { enum: ["basic", "pro", "enterprise"] }),
	requestedPermissions: text("requested_permissions"), // JSON数组
	reason: text("reason").notNull(), // 申请理由
	useCase: text("use_case"), // 使用场景描述
	expectedVolume: text("expected_volume"), // 预期请求量
	status: text("status", { enum: ["pending", "approved", "rejected", "processing"] }).default("pending"),
	reviewedBy: text("reviewed_by").references(() => users.id),
	reviewComment: text("review_comment"),
	submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
}, (table) => [
	index("applications_user_idx").on(table.userId),
	index("applications_status_idx").on(table.status),
	index("applications_type_idx").on(table.type),
	index("applications_submitted_idx").on(table.submittedAt),
]);

// 用户订阅/计费表
export const subscriptions = sqliteTable("subscriptions", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	tier: text("tier", { enum: ["free", "basic", "pro", "enterprise"] }).notNull(),
	status: text("status", { enum: ["active", "cancelled", "expired", "trial"] }).default("active"),
	billingCycle: text("billing_cycle", { enum: ["monthly", "yearly"] }),
	pricePerMonth: real("price_per_month"), // 月费用
	currency: text("currency").default("USD"),
	paymentMethod: text("payment_method"), // 支付方式
	stripeSubscriptionId: text("stripe_subscription_id"), // Stripe订阅ID
	trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
	currentPeriodStart: integer("current_period_start", { mode: "timestamp_ms" }),
	currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
	cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("subscriptions_user_idx").on(table.userId),
	index("subscriptions_status_idx").on(table.status),
	index("subscriptions_tier_idx").on(table.tier),
	index("subscriptions_stripe_idx").on(table.stripeSubscriptionId),
]);

// 每日使用量汇总表（用于计费和限制检查）
export const dailyUsageSummary = sqliteTable("daily_usage_summary", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }),
	date: text("date").notNull(), // YYYY-MM-DD
	totalRequests: integer("total_requests").default(0),
	successfulRequests: integer("successful_requests").default(0),
	errorRequests: integer("error_requests").default(0),
	totalResponseTime: integer("total_response_time").default(0), // 总响应时间
	avgResponseTime: real("avg_response_time"), // 平均响应时间
	totalDataTransfer: integer("total_data_transfer").default(0), // 总数据传输量(字节)
	uniqueEndpoints: integer("unique_endpoints").default(0), // 访问的不同端点数
	peakHourUsage: integer("peak_hour_usage").default(0), // 峰值小时使用量
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("daily_usage_user_date_idx").on(table.userId, table.date),
	index("daily_usage_api_key_date_idx").on(table.apiKeyId, table.date),
	index("daily_usage_date_idx").on(table.date),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	apiKeys: many(apiKeys),
	apiUsage: many(apiUsage),
	applications: many(applications),
	subscriptions: many(subscriptions),
	dailyUsage: many(dailyUsageSummary),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
	user: one(users, {
		fields: [apiKeys.userId],
		references: [users.id],
	}),
	usage: many(apiUsage),
	dailyUsage: many(dailyUsageSummary),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
	apiKey: one(apiKeys, {
		fields: [apiUsage.apiKeyId],
		references: [apiKeys.id],
	}),
	user: one(users, {
		fields: [apiUsage.userId],
		references: [users.id],
	}),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
	user: one(users, {
		fields: [applications.userId],
		references: [users.id],
	}),
	reviewer: one(users, {
		fields: [applications.reviewedBy],
		references: [users.id],
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id],
	}),
}));

export const dailyUsageSummaryRelations = relations(dailyUsageSummary, ({ one }) => ({
	user: one(users, {
		fields: [dailyUsageSummary.userId],
		references: [users.id],
	}),
	apiKey: one(apiKeys, {
		fields: [dailyUsageSummary.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Types
export type User = typeof users.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type DailyUsageSummary = typeof dailyUsageSummary.$inferSelect;
