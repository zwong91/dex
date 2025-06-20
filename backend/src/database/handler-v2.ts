/**
 * V2 Database Handler - 重构支持完整的用户和API密钥CRUD操作
 * 支持现代化的RESTful API设计和完整的V2架构
 */

import { drizzle } from "drizzle-orm/d1";
import { ZodError, z } from "zod";
import { users, apiKeys, permissions, subscriptions, applications, apiUsage, dailyUsageSummary } from "./schema";
import * as schema from "./schema";
import { and, eq, sql, desc, asc, like, or, count, gte, not } from "drizzle-orm";
import type { Env } from '../index';

// 生成API密钥的辅助函数
function generateApiKey(): string {
	const prefix = 'dex_';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = prefix;
	for (let i = 0; i < 32; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

// 生成唯一ID
function generateId(prefix: string = ''): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `${prefix}${timestamp}_${random}`;
}

// 生成API密钥哈希 - 实际生产环境应使用crypto.subtle
function hashApiKey(key: string): string {
	return `sha256-${key}-hash`;
}

// CORS headers
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

// 响应工具函数
function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

function errorResponse(message: string, status = 400) {
	return jsonResponse({ error: message }, status);
}

// 验证模式
const createApiKeySchema = z.object({
	userId: z.string(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	tier: z.enum(["free", "basic", "pro", "enterprise"]).default("free"),
	permissions: z.array(z.string()),
	rateLimitPerHour: z.number().int().min(1).max(100000).default(1000),
	rateLimitPerDay: z.number().int().min(1).max(1000000).default(10000)
});

const updateApiKeySchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	status: z.enum(["active", "suspended", "revoked"]).optional(),
	permissions: z.array(z.string()).optional(),
	rateLimitPerHour: z.number().int().min(1).max(100000).optional(),
	rateLimitPerDay: z.number().int().min(1).max(1000000).optional()
});

const createUserSchema = z.object({
	username: z.string().min(3).max(50),
	email: z.string().email(),
	fullName: z.string().min(1).max(100),
	company: z.string().optional(),
	website: z.string().url().optional(),
	bio: z.string().max(500).optional()
});

const updateUserSchema = z.object({
	username: z.string().min(3).max(50).optional(),
	email: z.string().email().optional(),
	fullName: z.string().min(1).max(100).optional(),
	company: z.string().optional(),
	website: z.string().url().optional(),
	bio: z.string().max(500).optional(),
	status: z.enum(["active", "suspended", "pending"]).optional()
});

// 验证管理员权限
async function validateAdminAccess(request: Request, env: Env): Promise<{ valid: boolean; error?: string }> {
	const authHeader = request.headers.get("Authorization");
	const apiKeyHeader = request.headers.get("X-API-Key");
	
	// 支持两种认证方式：Bearer token (管理员) 或 X-API-Key (用户)
	if (authHeader && authHeader === `Bearer ${env.KEY}`) {
		return { valid: true };
	}
	
	if (apiKeyHeader && env.D1_DATABASE) {
		const db = drizzle(env.D1_DATABASE, { schema });
		try {
			const keyRecord = await db.select().from(apiKeys)
				.where(eq(apiKeys.keyHash, hashApiKey(apiKeyHeader)))
				.limit(1);
			
			if (keyRecord.length > 0 && keyRecord[0].status === "active") {
				const permissions = JSON.parse(keyRecord[0].permissions || "[]");
				if (permissions.includes("admin_users") || permissions.includes("admin_api")) {
					// 更新最后使用时间
					await db.update(apiKeys)
						.set({ lastUsedAt: new Date() })
						.where(eq(apiKeys.id, keyRecord[0].id));
					return { valid: true };
				}
			}
		} catch (error) {
			console.error('API key validation error:', error);
		}
	}
	
	return { valid: false, error: "Unauthorized access" };
}

// ============================================================================
// API密钥管理路由
// ============================================================================

async function handleApiKeysList(request: Request, env: Env, db: any): Promise<Response> {
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
	const search = url.searchParams.get("search") || "";
	const status = url.searchParams.get("status") || "";
	const tier = url.searchParams.get("tier") || "";
	
	const offset = (page - 1) * limit;
	
	let whereConditions = [];
	if (search) {
		whereConditions.push(
			or(
				like(apiKeys.name, `%${search}%`),
				like(apiKeys.keyPrefix, `%${search}%`)
			)
		);
	}
	if (status && ["active", "suspended", "revoked"].includes(status)) {
		whereConditions.push(eq(apiKeys.status, status as any));
	}
	if (tier && ["free", "basic", "pro", "enterprise"].includes(tier)) {
		whereConditions.push(eq(apiKeys.tier, tier as any));
	}
	
	const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
	
	const [totalResult, keysList] = await Promise.all([
		db.select({ count: count() }).from(apiKeys).where(whereClause),
		db.select({
			id: apiKeys.id,
			name: apiKeys.name,
			description: apiKeys.description,
			keyPrefix: apiKeys.keyPrefix,
			tier: apiKeys.tier,
			status: apiKeys.status,
			permissions: apiKeys.permissions,
			rateLimitPerHour: apiKeys.rateLimitPerHour,
			rateLimitPerDay: apiKeys.rateLimitPerDay,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt,
			userId: apiKeys.userId
		})
		.from(apiKeys)
		.where(whereClause)
		.orderBy(desc(apiKeys.createdAt))
		.limit(limit)
		.offset(offset)
	]);
	
	return jsonResponse({
		success: true,
		data: {
			api_keys: keysList.map((key: any) => ({
				...key,
				permissions: JSON.parse(key.permissions || "[]")
			})),
			pagination: {
				page,
				limit,
				total: totalResult[0]?.count || 0,
				pages: Math.ceil((totalResult[0]?.count || 0) / limit)
			}
		}
	});
}

async function handleApiKeyCreate(request: Request, env: Env, db: any): Promise<Response> {
	try {
		const body = await request.json();
		const createData = createApiKeySchema.parse(body);
		
		// 验证用户是否存在
		const user = await db.select().from(users)
			.where(eq(users.id, createData.userId))
			.limit(1);
		
		if (user.length === 0) {
			return errorResponse("User not found", 404);
		}
		
		// 生成API密钥
		const apiKey = generateApiKey();
		const keyHash = hashApiKey(apiKey);
		const keyPrefix = apiKey.substring(0, 8) + '...';
		
		const newApiKey = await db.insert(apiKeys).values({
			userId: createData.userId,
			keyHash,
			keyPrefix,
			name: createData.name,
			description: createData.description,
			tier: createData.tier,
			permissions: JSON.stringify(createData.permissions),
			rateLimitPerHour: createData.rateLimitPerHour,
			rateLimitPerDay: createData.rateLimitPerDay,
			status: "active"
		}).returning();
		
		return jsonResponse({
			success: true,
			data: {
				...newApiKey[0],
				api_key: apiKey, // 只在创建时返回完整密钥
				permissions: createData.permissions
			}
		}, 201);
	} catch (error) {
		if (error instanceof ZodError) {
			return jsonResponse({ error: 'Invalid request data', details: error.errors }, 400);
		}
		return errorResponse("Failed to create API key", 500);
	}
}

async function handleApiKeyUpdate(request: Request, env: Env, db: any, apiKeyId: string): Promise<Response> {
	try {
		const body = await request.json();
		const updateData = updateApiKeySchema.parse(body);
		
		// 检查API密钥是否存在
		const existingKey = await db.select().from(apiKeys)
			.where(eq(apiKeys.id, apiKeyId))
			.limit(1);
		
		if (existingKey.length === 0) {
			return errorResponse("API key not found", 404);
		}
		
		const updateFields: any = { updatedAt: new Date() };
		if (updateData.name) updateFields.name = updateData.name;
		if (updateData.description !== undefined) updateFields.description = updateData.description;
		if (updateData.status) updateFields.status = updateData.status;
		if (updateData.permissions) updateFields.permissions = JSON.stringify(updateData.permissions);
		if (updateData.rateLimitPerHour) updateFields.rateLimitPerHour = updateData.rateLimitPerHour;
		if (updateData.rateLimitPerDay) updateFields.rateLimitPerDay = updateData.rateLimitPerDay;
		
		const updatedKey = await db.update(apiKeys)
			.set(updateFields)
			.where(eq(apiKeys.id, apiKeyId))
			.returning();
		
		return jsonResponse({
			success: true,
			data: {
				...updatedKey[0],
				permissions: JSON.parse(updatedKey[0].permissions || "[]")
			}
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return jsonResponse({ error: 'Invalid request data', details: error.errors }, 400);
		}
		return errorResponse("Failed to update API key", 500);
	}
}

async function handleApiKeyDelete(request: Request, env: Env, db: any, apiKeyId: string): Promise<Response> {
	// 检查API密钥是否存在
	const keyToDelete = await db.select().from(apiKeys)
		.where(eq(apiKeys.id, apiKeyId))
		.limit(1);
	
	if (keyToDelete.length === 0) {
		return errorResponse("API key not found", 404);
	}
	
	// 软删除 - 更新状态为revoked
	await db.update(apiKeys)
		.set({ 
			status: "revoked",
			updatedAt: new Date()
		})
		.where(eq(apiKeys.id, apiKeyId));
	
	return jsonResponse({
		success: true,
		message: "API key revoked successfully"
	});
}

// ============================================================================
// 用户管理路由
// ============================================================================

async function handleUserDetail(request: Request, env: Env, db: any, userId: string): Promise<Response> {
	if (request.method === "GET") {
		const user = await db.select().from(users)
			.where(eq(users.id, userId))
			.limit(1);
		
		if (user.length === 0) {
			return errorResponse("User not found", 404);
		}
		
		// 获取用户的API密钥
		const userApiKeys = await db.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			tier: apiKeys.tier,
			status: apiKeys.status,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt
		}).from(apiKeys)
		.where(eq(apiKeys.userId, userId));
		
		return jsonResponse({
			success: true,
			data: {
				...user[0],
				apiKeys: userApiKeys
			}
		});
	}
	
	if (request.method === "PUT") {
		return await handleUserUpdate(request, env, db, userId);
	}
	
	if (request.method === "DELETE") {
		return await handleUserDelete(request, env, db, userId);
	}
	
	return errorResponse("Method not allowed", 405);
}

async function handleUsersList(request: Request, env: Env, db: any): Promise<Response> {
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
	const search = url.searchParams.get("search") || "";
	const status = url.searchParams.get("status") || "";
	
	const offset = (page - 1) * limit;
	
	let whereConditions = [];
	if (search) {
		whereConditions.push(
			or(
				like(users.username, `%${search}%`),
				like(users.email, `%${search}%`),
				like(users.fullName, `%${search}%`)
			)
		);
	}
	if (status && ["active", "suspended", "pending"].includes(status)) {
		whereConditions.push(eq(users.status, status as any));
	}
	
	const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
	
	const [totalResult, usersList] = await Promise.all([
		db.select({ count: count() }).from(users).where(whereClause),
		db.select().from(users)
		.where(whereClause)
		.orderBy(desc(users.createdAt))
		.limit(limit)
		.offset(offset)
	]);
	
	return jsonResponse({
		success: true,
		data: {
			users: usersList,
			pagination: {
				page,
				limit,
				total: totalResult[0]?.count || 0,
				pages: Math.ceil((totalResult[0]?.count || 0) / limit)
			}
		}
	});
}

async function handleUserCreate(request: Request, env: Env, db: any): Promise<Response> {
	try {
		const body = await request.json();
		const createUserData = createUserSchema.parse(body);
		
		// 检查邮箱是否已存在
		const existingUser = await db.select().from(users)
			.where(eq(users.email, createUserData.email))
			.limit(1);
		
		if (existingUser.length > 0) {
			return errorResponse("Email already exists");
		}
		
		// 检查用户名是否已存在
		if (createUserData.username) {
			const existingUsername = await db.select().from(users)
				.where(eq(users.username, createUserData.username))
				.limit(1);
			
			if (existingUsername.length > 0) {
				return errorResponse("Username already exists");
			}
		}
		
		const newUser = await db.insert(users).values({
			id: generateId('user_'),
			username: createUserData.username,
			email: createUserData.email,
			fullName: createUserData.fullName,
			company: createUserData.company,
			website: createUserData.website,
			bio: createUserData.bio,
			status: "active",
			emailVerified: false
		}).returning();
		
		return jsonResponse({
			success: true,
			data: newUser[0]
		}, 201);
	} catch (error) {
		if (error instanceof ZodError) {
			return jsonResponse({ error: 'Invalid request data', details: error.errors }, 400);
		}
		return errorResponse("Failed to create user", 500);
	}
}

async function handleUserUpdate(request: Request, env: Env, db: any, userId: string): Promise<Response> {
	try {
		const body = await request.json();
		const updateUserData = updateUserSchema.parse(body);
		
		// 检查用户是否存在
		const existingUserToUpdate = await db.select().from(users)
			.where(eq(users.id, userId))
			.limit(1);
		
		if (existingUserToUpdate.length === 0) {
			return errorResponse("User not found", 404);
		}
		
		// 检查用户名冲突
		if (updateUserData.username) {
			const usernameConflict = await db.select().from(users)
				.where(and(
					eq(users.username, updateUserData.username),
					not(eq(users.id, userId))
				))
				.limit(1);
			
			if (usernameConflict.length > 0) {
				return errorResponse("Username already exists");
			}
		}
		
		// 检查邮箱冲突
		if (updateUserData.email) {
			const emailConflict = await db.select().from(users)
				.where(and(
					eq(users.email, updateUserData.email),
					not(eq(users.id, userId))
				))
				.limit(1);
			
			if (emailConflict.length > 0) {
				return errorResponse("Email already exists");
			}
		}
		
		const updateFields: any = { updatedAt: new Date() };
		if (updateUserData.username) updateFields.username = updateUserData.username;
		if (updateUserData.email) updateFields.email = updateUserData.email;
		if (updateUserData.fullName) updateFields.fullName = updateUserData.fullName;
		if (updateUserData.company !== undefined) updateFields.company = updateUserData.company;
		if (updateUserData.website !== undefined) updateFields.website = updateUserData.website;
		if (updateUserData.bio !== undefined) updateFields.bio = updateUserData.bio;
		if (updateUserData.status) updateFields.status = updateUserData.status;
		
		const updatedUser = await db.update(users)
			.set(updateFields)
			.where(eq(users.id, userId))
			.returning();
		
		return jsonResponse({
			success: true,
			data: updatedUser[0]
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return jsonResponse({ error: 'Invalid request data', details: error.errors }, 400);
		}
		return errorResponse("Failed to update user", 500);
	}
}

async function handleUserDelete(request: Request, env: Env, db: any, userId: string): Promise<Response> {
	// 检查用户是否存在
	const userToDelete = await db.select().from(users)
		.where(eq(users.id, userId))
		.limit(1);
	
	if (userToDelete.length === 0) {
		return errorResponse("User not found", 404);
	}
	
	// 软删除 - 更新状态为suspended并撤销所有API密钥
	await Promise.all([
		db.update(users)
			.set({ 
				status: "suspended",
				updatedAt: new Date()
			})
			.where(eq(users.id, userId)),
		db.update(apiKeys)
			.set({ 
				status: "revoked",
				updatedAt: new Date()
			})
			.where(eq(apiKeys.userId, userId))
	]);
	
	return jsonResponse({
		success: true,
		message: "User suspended successfully"
	});
}

// ============================================================================
// 权限管理路由
// ============================================================================

async function handlePermissionsList(request: Request, env: Env, db: any): Promise<Response> {
	const url = new URL(request.url);
	const category = url.searchParams.get("category") || "";
	const tier = url.searchParams.get("tier") || "";
	
	let whereConditions = [];
	if (category) {
		whereConditions.push(eq(permissions.category, category));
	}
	if (tier && ["free", "basic", "pro", "enterprise"].includes(tier)) {
		whereConditions.push(eq(permissions.tier, tier as any));
	}
	
	const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
	
	const permissionsList = await db.select().from(permissions)
		.where(whereClause)
		.orderBy(asc(permissions.category), asc(permissions.name));
	
	// 按类别和层级分组
	const groupedPermissions = permissionsList.reduce((acc: any, perm: any) => {
		if (!acc[perm.category]) {
			acc[perm.category] = {};
		}
		if (!acc[perm.category][perm.tier]) {
			acc[perm.category][perm.tier] = [];
		}
		acc[perm.category][perm.tier].push(perm);
		return acc;
	}, {});
	
	return jsonResponse({
		success: true,
		data: {
			permissions: permissionsList,
			grouped_permissions: groupedPermissions,
			categories: [...new Set(permissionsList.map((p: any) => p.category))],
			tiers: ["free", "basic", "pro", "enterprise"]
		}
	});
}

// ============================================================================
// 分析统计路由
// ============================================================================

async function handleAnalytics(request: Request, env: Env, db: any): Promise<Response> {
	const url = new URL(request.url);
	const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "30")));
	
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
	
	try {
		// 获取基本统计
		const [
			totalUsers,
			activeUsers,
			totalApiKeys,
			activeApiKeys,
			tierStats
		] = await Promise.all([
			db.select({ count: count() }).from(users),
			db.select({ count: count() }).from(users).where(eq(users.status, "active")),
			db.select({ count: count() }).from(apiKeys),
			db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.status, "active")),
			db.select({
				tier: apiKeys.tier,
				count: count()
			}).from(apiKeys)
			.where(eq(apiKeys.status, "active"))
			.groupBy(apiKeys.tier)
		]);
		
		return jsonResponse({
			success: true,
			data: {
				overview: {
					total_users: totalUsers[0]?.count || 0,
					active_users: activeUsers[0]?.count || 0,
					total_api_keys: totalApiKeys[0]?.count || 0,
					active_api_keys: activeApiKeys[0]?.count || 0
				},
				tier_distribution: tierStats,
				period_days: days
			}
		});
	} catch (error) {
		console.error('Analytics error:', error);
		return errorResponse("Failed to fetch analytics", 500);
	}
}

// ============================================================================
// 应用申请管理路由
// ============================================================================

async function handleApplicationsDetail(request: Request, env: Env, db: any, applicationId: string): Promise<Response> {
	if (request.method === "GET") {
		const application = await db.select().from(applications)
			.where(eq(applications.id, applicationId))
			.limit(1);
		
		if (application.length === 0) {
			return errorResponse("Application not found", 404);
		}
		
		return jsonResponse({
			success: true,
			data: application[0]
		});
	}
	
	if (request.method === "PUT") {
		return await handleApplicationReview(request, env, db, applicationId);
	}
	
	return errorResponse("Method not allowed", 405);
}

async function handleApplicationsList(request: Request, env: Env, db: any): Promise<Response> {
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
	const status = url.searchParams.get("status") || "";
	const type = url.searchParams.get("type") || "";
	
	const offset = (page - 1) * limit;
	
	let whereConditions = [];
	if (status && ["pending", "approved", "rejected", "processing"].includes(status)) {
		whereConditions.push(eq(applications.status, status as any));
	}
	if (type && ["api_key", "tier_upgrade", "permission_request"].includes(type)) {
		whereConditions.push(eq(applications.type, type as any));
	}
	
	const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
	
	const [totalResult, applicationsList] = await Promise.all([
		db.select({ count: count() }).from(applications).where(whereClause),
		db.select().from(applications)
		.where(whereClause)
		.orderBy(desc(applications.submittedAt))
		.limit(limit)
		.offset(offset)
	]);
	
	return jsonResponse({
		success: true,
		data: {
			applications: applicationsList.map((app: any) => ({
				...app,
				requestedPermissions: app.requestedPermissions ? JSON.parse(app.requestedPermissions) : []
			})),
			pagination: {
				page,
				limit,
				total: totalResult[0]?.count || 0,
				pages: Math.ceil((totalResult[0]?.count || 0) / limit)
			}
		}
	});
}

async function handleApplicationReview(request: Request, env: Env, db: any, applicationId: string): Promise<Response> {
	try {
		const body = await request.json();
		const { status, reviewComment } = body;
		
		if (!["approved", "rejected"].includes(status)) {
			return errorResponse("Status must be 'approved' or 'rejected'");
		}
		
		const applicationToReview = await db.select().from(applications)
			.where(eq(applications.id, applicationId))
			.limit(1);
		
		if (applicationToReview.length === 0) {
			return errorResponse("Application not found", 404);
		}
		
		const updatedApplication = await db.update(applications)
			.set({
				status,
				reviewComment,
				reviewedAt: new Date()
			})
			.where(eq(applications.id, applicationId))
			.returning();
		
		return jsonResponse({
			success: true,
			data: updatedApplication[0]
		});
	} catch (error) {
		return errorResponse("Failed to review application", 500);
	}
}

// ============================================================================
// 主路由处理器
// ============================================================================

export async function databaseV2Handler(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const method = request.method;
	
	// 处理OPTIONS预检请求
	if (method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}
	
	// 检查D1数据库绑定
	if (!env.D1_DATABASE) {
		return errorResponse("Database service not available", 503);
	}
	
	// 验证管理员权限
	const authResult = await validateAdminAccess(request, env);
	if (!authResult.valid) {
		return errorResponse(authResult.error || "Unauthorized", 401);
	}
	
	const db = drizzle(env.D1_DATABASE, { schema });
	
	try {
		// 解析路径: /api/v2/admin/{resource}/{id?}
		const pathParts = url.pathname.split('/').filter(Boolean);
		
		if (pathParts.length < 4 || pathParts[0] !== "api" || pathParts[1] !== "v2" || pathParts[2] !== "admin") {
			return errorResponse("Invalid API path", 404);
		}
		
		const resource = pathParts[3];
		const resourceId = pathParts[4] || null;
		
		switch (resource) {
			case "api-keys":
				if (!resourceId) {
					if (method === "GET") {
						return await handleApiKeysList(request, env, db);
					}
					if (method === "POST") {
						return await handleApiKeyCreate(request, env, db);
					}
				} else {
					if (method === "GET") {
						const key = await db.select().from(apiKeys).where(eq(apiKeys.id, resourceId)).limit(1);
						if (key.length === 0) return errorResponse("API key not found", 404);
						return jsonResponse({ success: true, data: { ...key[0], permissions: JSON.parse(key[0].permissions || "[]") } });
					}
					if (method === "PUT") {
						return await handleApiKeyUpdate(request, env, db, resourceId);
					}
					if (method === "DELETE") {
						return await handleApiKeyDelete(request, env, db, resourceId);
					}
				}
				break;
				
			case "users":
				if (!resourceId) {
					if (method === "GET") {
						return await handleUsersList(request, env, db);
					}
					if (method === "POST") {
						return await handleUserCreate(request, env, db);
					}
				} else {
					return await handleUserDetail(request, env, db, resourceId);
				}
				break;
				
			case "permissions":
				if (method === "GET") {
					return await handlePermissionsList(request, env, db);
				}
				break;
				
			case "analytics":
				if (method === "GET") {
					return await handleAnalytics(request, env, db);
				}
				break;
				
			case "applications":
				if (!resourceId) {
					if (method === "GET") {
						return await handleApplicationsList(request, env, db);
					}
				} else {
					return await handleApplicationsDetail(request, env, db, resourceId);
				}
				break;
				
			default:
				return errorResponse("Resource not found", 404);
		}
		
		return errorResponse("Method not allowed", 405);
	} catch (error) {
		console.error('Database V2 error:', error);
		if (error instanceof ZodError) {
			return jsonResponse({ 
				error: 'Invalid request data', 
				details: error.errors 
			}, 400);
		}
		return jsonResponse({ error: 'Internal server error' }, 500);
	}
}
				where: (apiKeys, { eq, and }) => and(
					eq(apiKeys.keyHash, apiKeyHeader),
					eq(apiKeys.status, 'active')
				),
				with: {
					user: true
				}
			});
			
			if (keyRecord && keyRecord.tier === 'enterprise') {
				const permissions = JSON.parse(keyRecord.permissions || '[]');
				if (permissions.includes('admin_users') || permissions.includes('admin_api')) {
					return { valid: true };
				}
			}
		} catch (error) {
			console.error('API key validation error:', error);
		}
	}
	
	return { 
		valid: false, 
		error: "Admin access required. Use Bearer token or enterprise API key with admin permissions." 
	};
}

export async function createDatabaseV2Handler(env: Env) {
	return async function handleDatabaseV2Request(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		
		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
		};

		// Handle preflight requests
		if (method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Check if D1 database binding is available
		if (!env.D1_DATABASE) {
			return new Response(JSON.stringify({ 
				error: "Database service not available",
				message: "D1_DATABASE binding is not configured"
			}), { 
				status: 503,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const db = drizzle(env.D1_DATABASE, { schema });

		try {
			// API Key 管理路由
			if (path.startsWith('/api/v2/admin/api-keys')) {
				return await handleApiKeysRoutes(request, db, corsHeaders, env);
			}
			
			// 用户管理路由  
			if (path.startsWith('/api/v2/admin/users')) {
				return await handleUsersRoutes(request, db, corsHeaders, env);
			}
			
			// 权限管理路由
			if (path.startsWith('/api/v2/admin/permissions')) {
				return await handlePermissionsRoutes(request, db, corsHeaders, env);
			}
			
			// 使用统计路由
			if (path.startsWith('/api/v2/admin/analytics')) {
				return await handleAnalyticsRoutes(request, db, corsHeaders, env);
			}
			
			// 应用申请管理路由
			if (path.startsWith('/api/v2/admin/applications')) {
				return await handleApplicationsRoutes(request, db, corsHeaders, env);
			}

			return new Response(JSON.stringify({
				error: 'Not Found',
				message: 'API endpoint not found',
				available_endpoints: [
					'/api/v2/admin/api-keys',
					'/api/v2/admin/users', 
					'/api/v2/admin/permissions',
					'/api/v2/admin/analytics',
					'/api/v2/admin/applications'
				]
			}), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});

		} catch (error) {
			console.error('Database V2 handler error:', error);
			if (error instanceof ZodError) {
				return new Response(JSON.stringify({ 
					error: 'Validation Error', 
					details: error.errors 
				}), { 
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}
			return new Response(JSON.stringify({ 
				error: 'Internal Server Error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}), { 
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	};
}

// API Keys CRUD 操作处理
async function handleApiKeysRoutes(request: Request, db: any, corsHeaders: any, env: Env) {
	const url = new URL(request.url);
	const method = request.method;
	const pathSegments = url.pathname.split('/').filter(Boolean);
	const apiKeyId = pathSegments[4]; // /api/v2/admin/api-keys/{id}

	// 验证管理员权限
	const authResult = await validateAdminAccess(request, env);
	if (!authResult.valid) {
		return new Response(JSON.stringify({
			error: 'Unauthorized',
			message: authResult.error
		}), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		switch (method) {
			case 'GET':
				if (apiKeyId) {
					// 获取单个API密钥详情
					const apiKey = await db.query.apiKeys.findFirst({
						where: (apiKeys, { eq }) => eq(apiKeys.id, apiKeyId),
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									name: true,
									status: true
								}
							}
						}
					});

					if (!apiKey) {
						return new Response(JSON.stringify({
							error: 'Not Found',
							message: 'API key not found'
						}), {
							status: 404,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' }
						});
					}

					// 不返回实际的keyHash，出于安全考虑
					const { keyHash, ...safeApiKey } = apiKey;
					
					return new Response(JSON.stringify({
						success: true,
						api_key: {
							...safeApiKey,
							permissions: JSON.parse(apiKey.permissions || '[]'),
							keyPreview: apiKey.keyPrefix + '...'
						}
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				} else {
					// 获取API密钥列表
					const page = parseInt(url.searchParams.get('page') || '1');
					const limit = parseInt(url.searchParams.get('limit') || '20');
					const search = url.searchParams.get('search') || '';
					const tier = url.searchParams.get('tier') || '';
					const status = url.searchParams.get('status') || '';
					
					const offset = (page - 1) * limit;
					
					let whereConditions = [];
					if (search) {
						whereConditions.push(
							or(
								like(apiKeys.name, `%${search}%`),
								like(apiKeys.keyPrefix, `%${search}%`)
							)
						);
					}				if (tier && ["free", "basic", "pro", "enterprise"].includes(tier)) {
					whereConditions.push(eq(apiKeys.tier, tier as "free" | "basic" | "pro" | "enterprise"));
				}
					if (status) {
						whereConditions.push(eq(apiKeys.status, status));
					}

					const apiKeysList = await db.query.apiKeys.findMany({
						where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									name: true
								}
							}
						},
						limit,
						offset,
						orderBy: [desc(apiKeys.createdAt)]
					});

					// 计算总数
					const totalQuery = await db.select({ count: sql`count(*)` })
						.from(apiKeys)
						.where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
					const total = totalQuery[0]?.count || 0;

					return new Response(JSON.stringify({
						success: true,
						api_keys: apiKeysList.map(key => ({
							...key,
							keyHash: undefined, // 不返回hash
							permissions: JSON.parse(key.permissions || '[]'),
							keyPreview: key.keyPrefix + '...'
						})),
						pagination: {
							page,
							limit,
							total,
							pages: Math.ceil(total / limit),
							has_more: offset + limit < total
						}
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

			case 'POST':
				// 创建新的API密钥
				const createSchema = z.object({
					userId: z.string(),
					name: z.string().min(1).max(100),
					description: z.string().optional(),
					tier: z.enum(['free', 'basic', 'pro', 'enterprise']),
					permissions: z.array(z.string()),
					rateLimitPerHour: z.number().optional(),
					rateLimitPerDay: z.number().optional(),
					allowedIps: z.array(z.string()).optional(),
					allowedDomains: z.array(z.string()).optional(),
					expiresAt: z.string().optional() // ISO string
				});

				const createData = createSchema.parse(await request.json());
				
				// 验证用户存在
				const user = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.id, createData.userId)
				});
				
				if (!user) {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'User not found'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				// 生成新的API密钥
				const newApiKey = generateApiKey();
				const keyHash = hashApiKey(newApiKey);
				const keyPrefix = newApiKey.substring(0, 8) + '...';

				const defaultRateLimits = {
					free: { hour: 50, day: 500 },
					basic: { hour: 1000, day: 10000 },
					pro: { hour: 10000, day: 100000 },
					enterprise: { hour: 50000, day: 1000000 }
				};

				const limits = defaultRateLimits[createData.tier];

				const newApiKeyRecord = await db.insert(apiKeys).values({
					id: generateId('key_'),
					userId: createData.userId,
					keyHash,
					keyPrefix,
					name: createData.name,
					description: createData.description,
					tier: createData.tier,
					status: 'active',
					permissions: JSON.stringify(createData.permissions),
					rateLimitPerHour: createData.rateLimitPerHour || limits.hour,
					rateLimitPerDay: createData.rateLimitPerDay || limits.day,
					allowedIps: createData.allowedIps ? JSON.stringify(createData.allowedIps) : null,
					allowedDomains: createData.allowedDomains ? JSON.stringify(createData.allowedDomains) : null,
					expiresAt: createData.expiresAt ? new Date(createData.expiresAt).getTime() : null,
					createdAt: Date.now(),
					updatedAt: Date.now()
				}).returning().get();

				return new Response(JSON.stringify({
					success: true,
					message: 'API key created successfully',
					api_key: {
						...newApiKeyRecord,
						keyHash: undefined, // 不返回hash
						permissions: JSON.parse(newApiKeyRecord.permissions || '[]'),
						// 只在创建时返回完整密钥，后续不再显示
						key: newApiKey,
						warning: 'This is the only time the full API key will be displayed. Please save it securely.'
					}
				}), {
					status: 201,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			case 'PUT':
				// 更新API密钥
				if (!apiKeyId) {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'API key ID is required'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const updateSchema = z.object({
					name: z.string().min(1).max(100).optional(),
					description: z.string().optional(),
					tier: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
					status: z.enum(['active', 'suspended', 'revoked']).optional(),
					permissions: z.array(z.string()).optional(),
					rateLimitPerHour: z.number().optional(),
					rateLimitPerDay: z.number().optional(),
					allowedIps: z.array(z.string()).optional(),
					allowedDomains: z.array(z.string()).optional(),
					expiresAt: z.string().nullable().optional()
				});

				const updateData = updateSchema.parse(await request.json());
				
				// 验证API密钥存在
				const existingKey = await db.query.apiKeys.findFirst({
					where: (apiKeys, { eq }) => eq(apiKeys.id, apiKeyId)
				});
				
				if (!existingKey) {
					return new Response(JSON.stringify({
						error: 'Not Found',
						message: 'API key not found'
					}), {
						status: 404,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const updateFields: any = {
					updatedAt: Date.now()
				};

				if (updateData.name !== undefined) updateFields.name = updateData.name;
				if (updateData.description !== undefined) updateFields.description = updateData.description;
				if (updateData.tier !== undefined) updateFields.tier = updateData.tier;
				if (updateData.status !== undefined) updateFields.status = updateData.status;
				if (updateData.permissions !== undefined) updateFields.permissions = JSON.stringify(updateData.permissions);
				if (updateData.rateLimitPerHour !== undefined) updateFields.rateLimitPerHour = updateData.rateLimitPerHour;
				if (updateData.rateLimitPerDay !== undefined) updateFields.rateLimitPerDay = updateData.rateLimitPerDay;
				if (updateData.allowedIps !== undefined) updateFields.allowedIps = updateData.allowedIps ? JSON.stringify(updateData.allowedIps) : null;
				if (updateData.allowedDomains !== undefined) updateFields.allowedDomains = updateData.allowedDomains ? JSON.stringify(updateData.allowedDomains) : null;
				if (updateData.expiresAt !== undefined) updateFields.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt).getTime() : null;

				const updatedKey = await db.update(apiKeys)
					.set(updateFields)
					.where(eq(apiKeys.id, apiKeyId))
					.returning()
					.get();

				return new Response(JSON.stringify({
					success: true,
					message: 'API key updated successfully',
					api_key: {
						...updatedKey,
						keyHash: undefined,
						permissions: JSON.parse(updatedKey.permissions || '[]'),
						keyPreview: updatedKey.keyPrefix + '...'
					}
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			case 'DELETE':
				// 删除API密钥
				if (!apiKeyId) {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'API key ID is required'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const keyToDelete = await db.query.apiKeys.findFirst({
					where: (apiKeys, { eq }) => eq(apiKeys.id, apiKeyId)
				});
				
				if (!keyToDelete) {
					return new Response(JSON.stringify({
						error: 'Not Found',
						message: 'API key not found'
					}), {
						status: 404,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				// 软删除：设置状态为revoked而不是物理删除
				await db.update(apiKeys)
					.set({ 
						status: 'revoked',
						updatedAt: Date.now()
					})
					.where(eq(apiKeys.id, apiKeyId));

				return new Response(JSON.stringify({
					success: true,
					message: 'API key revoked successfully'
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			default:
				return new Response(JSON.stringify({
					error: 'Method Not Allowed',
					message: `Method ${method} is not allowed for this endpoint`
				}), {
					status: 405,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
		}
	} catch (error) {
		console.error('API Keys route error:', error);
		throw error;
	}
}

// 用户 CRUD 操作处理
async function handleUsersRoutes(request: Request, db: any, corsHeaders: any, env: Env) {
	const url = new URL(request.url);
	const method = request.method;
	const pathSegments = url.pathname.split('/').filter(Boolean);
	const userId = pathSegments[4]; // /api/v2/admin/users/{id}

	// 验证管理员权限
	const authResult = await validateAdminAccess(request, env);
	if (!authResult.valid) {
		return new Response(JSON.stringify({
			error: 'Unauthorized',
			message: authResult.error
		}), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		switch (method) {
			case 'GET':
				if (userId) {
					// 获取单个用户详情
					const user = await db.query.users.findFirst({
						where: (users, { eq }) => eq(users.id, userId),
						with: {
							apiKeys: {
								columns: {
									id: true,
									name: true,
									tier: true,
									status: true,
									keyPrefix: true,
									createdAt: true,
									lastUsedAt: true
								}
							},
							subscriptions: true,
							applications: {
								orderBy: [desc(applications.submittedAt)]
							}
						}
					});

					if (!user) {
						return new Response(JSON.stringify({
							error: 'Not Found',
							message: 'User not found'
						}), {
							status: 404,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' }
						});
					}

					// 获取用户的API使用统计
					const usageStats = await db.query.dailyUsageSummary.findMany({
						where: (dailyUsageSummary, { eq, gte }) => and(
							eq(dailyUsageSummary.userId, userId),
							gte(dailyUsageSummary.date, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
						),
						orderBy: [desc(dailyUsageSummary.date)],
						limit: 30
					});

					return new Response(JSON.stringify({
						success: true,
						user: {
							...user,
							apiKeys: user.apiKeys.map(key => ({
								...key,
								keyPreview: key.keyPrefix + '...'
							})),
							usage_stats: usageStats
						}
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				} else {
					// 获取用户列表
					const page = parseInt(url.searchParams.get('page') || '1');
					const limit = parseInt(url.searchParams.get('limit') || '20');
					const search = url.searchParams.get('search') || '';
					const status = url.searchParams.get('status') || '';
					const tier = url.searchParams.get('tier') || '';
					
					const offset = (page - 1) * limit;
					
					let whereConditions = [];
					if (search) {
						whereConditions.push(
							or(
								like(users.email, `%${search}%`),
								like(users.name, `%${search}%`),
								like(users.username, `%${search}%`)
							)
						);
					}
					if (status) {
						whereConditions.push(eq(users.status, status));
					}

					const usersList = await db.query.users.findMany({
						where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
						with: {
							apiKeys: {
								columns: {
									id: true,
									tier: true,
									status: true
								}
							},
							subscriptions: {
								columns: {
									tier: true,
									status: true
								}
							}
						},
						limit,
						offset,
						orderBy: [desc(users.createdAt)]
					});

					// 计算总数
					const totalQuery = await db.select({ count: sql`count(*)` })
						.from(users)
						.where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
					const total = totalQuery[0]?.count || 0;

					return new Response(JSON.stringify({
						success: true,
						users: usersList.map(user => ({
							...user,
							apiKeysCount: user.apiKeys.length,
							highestTier: user.apiKeys.reduce((highest, key) => {
								const tierOrder = { free: 0, basic: 1, pro: 2, enterprise: 3 };
								return tierOrder[key.tier] > tierOrder[highest] ? key.tier : highest;
							}, 'free'),
							apiKeys: undefined // 不在列表中返回详细的API密钥信息
						})),
						pagination: {
							page,
							limit,
							total,
							pages: Math.ceil(total / limit),
							has_more: offset + limit < total
						}
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

			case 'POST':
				// 创建新用户
				const createUserSchema = z.object({
					email: z.string().email(),
					username: z.string().min(3).max(30).optional(),
					name: z.string().min(1).max(100).optional(),
					company: z.string().optional(),
					website: z.string().url().optional(),
					bio: z.string().max(500).optional(),
					walletAddress: z.string().optional(),
					status: z.enum(['active', 'suspended', 'pending']).default('pending')
				});

				const createUserData = createUserSchema.parse(await request.json());
				
				// 检查邮箱是否已存在
				const existingUser = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.email, createUserData.email)
				});
				
				if (existingUser) {
					return new Response(JSON.stringify({
						error: 'Conflict',
						message: 'User with this email already exists'
					}), {
						status: 409,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				// 检查用户名是否已存在（如果提供）
				if (createUserData.username) {
					const existingUsername = await db.query.users.findFirst({
						where: (users, { eq }) => eq(users.username, createUserData.username)
					});
					
					if (existingUsername) {
						return new Response(JSON.stringify({
							error: 'Conflict',
							message: 'Username already taken'
						}), {
							status: 409,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' }
						});
					}
				}

				const newUser = await db.insert(users).values({
					id: generateId('user_'),
					email: createUserData.email,
					username: createUserData.username,
					name: createUserData.name,
					company: createUserData.company,
					website: createUserData.website,
					bio: createUserData.bio,
					walletAddress: createUserData.walletAddress,
					status: createUserData.status,
					emailVerified: false,
					createdAt: Date.now(),
					updatedAt: Date.now()
				}).returning().get();

				return new Response(JSON.stringify({
					success: true,
					message: 'User created successfully',
					user: newUser
				}), {
					status: 201,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			case 'PUT':
				// 更新用户
				if (!userId) {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'User ID is required'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const updateUserSchema = z.object({
					username: z.string().min(3).max(30).optional(),
					name: z.string().min(1).max(100).optional(),
					company: z.string().optional(),
					website: z.string().url().optional(),
					bio: z.string().max(500).optional(),
					walletAddress: z.string().optional(),
					status: z.enum(['active', 'suspended', 'pending']).optional(),
					emailVerified: z.boolean().optional()
				});

				const updateUserData = updateUserSchema.parse(await request.json());
				
				// 验证用户存在
				const existingUserToUpdate = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.id, userId)
				});
				
				if (!existingUserToUpdate) {
					return new Response(JSON.stringify({
						error: 'Not Found',
						message: 'User not found'
					}), {
						status: 404,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				// 检查用户名冲突（如果更新用户名）
				if (updateUserData.username && updateUserData.username !== existingUserToUpdate.username) {
					const usernameConflict = await db.query.users.findFirst({
						where: (users, { eq, and, ne }) => and(
							eq(users.username, updateUserData.username),
							ne(users.id, userId)
						)
					});
					
					if (usernameConflict) {
						return new Response(JSON.stringify({
							error: 'Conflict',
							message: 'Username already taken'
						}), {
							status: 409,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' }
						});
					}
				}

				const updateUserFields: any = {
					updatedAt: Date.now()
				};

				if (updateUserData.username !== undefined) updateUserFields.username = updateUserData.username;
				if (updateUserData.name !== undefined) updateUserFields.name = updateUserData.name;
				if (updateUserData.company !== undefined) updateUserFields.company = updateUserData.company;
				if (updateUserData.website !== undefined) updateUserFields.website = updateUserData.website;
				if (updateUserData.bio !== undefined) updateUserFields.bio = updateUserData.bio;
				if (updateUserData.walletAddress !== undefined) updateUserFields.walletAddress = updateUserData.walletAddress;
				if (updateUserData.status !== undefined) updateUserFields.status = updateUserData.status;
				if (updateUserData.emailVerified !== undefined) updateUserFields.emailVerified = updateUserData.emailVerified;

				const updatedUser = await db.update(users)
					.set(updateUserFields)
					.where(eq(users.id, userId))
					.returning()
					.get();

				return new Response(JSON.stringify({
					success: true,
					message: 'User updated successfully',
					user: updatedUser
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			case 'DELETE':
				// 删除用户
				if (!userId) {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'User ID is required'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const userToDelete = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.id, userId),
					with: {
						apiKeys: true
					}
				});
				
				if (!userToDelete) {
					return new Response(JSON.stringify({
						error: 'Not Found',
						message: 'User not found'
					}), {
						status: 404,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				// 软删除：设置状态为suspended而不是物理删除
				// 同时撤销所有API密钥
				await db.update(users)
					.set({ 
						status: 'suspended',
						updatedAt: Date.now()
					})
					.where(eq(users.id, userId));

				// 撤销用户的所有API密钥
				if (userToDelete.apiKeys.length > 0) {
					await db.update(apiKeys)
						.set({ 
							status: 'revoked',
							updatedAt: Date.now()
						})
						.where(eq(apiKeys.userId, userId));
				}

				return new Response(JSON.stringify({
					success: true,
					message: 'User suspended and API keys revoked successfully'
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			default:
				return new Response(JSON.stringify({
					error: 'Method Not Allowed',
					message: `Method ${method} is not allowed for this endpoint`
				}), {
					status: 405,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
		}
	} catch (error) {
		console.error('Users route error:', error);
		throw error;
	}
}

// 权限管理路由处理
async function handlePermissionsRoutes(request: Request, db: any, corsHeaders: any, env: Env) {
	const url = new URL(request.url);
	const method = request.method;

	// 验证管理员权限
	const authResult = await validateAdminAccess(request, env);
	if (!authResult.valid) {
		return new Response(JSON.stringify({
			error: 'Unauthorized',
			message: authResult.error
		}), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		switch (method) {
			case 'GET':
				// 获取权限列表
				const category = url.searchParams.get('category') || '';
				const tier = url.searchParams.get('tier') || '';
				
				let whereConditions = [];
				if (category) {
					whereConditions.push(eq(permissions.category, category));
				}
				if (tier) {
					whereConditions.push(eq(permissions.tier, tier));
				}

				const permissionsList = await db.query.permissions.findMany({
					where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
					orderBy: [asc(permissions.tier), asc(permissions.category), asc(permissions.name)]
				});

				// 按类别和层级分组
				const groupedPermissions = permissionsList.reduce((acc, perm) => {
					if (!acc[perm.category]) {
						acc[perm.category] = {};
					}
					if (!acc[perm.category][perm.tier]) {
						acc[perm.category][perm.tier] = [];
					}
					acc[perm.category][perm.tier].push(perm);
					return acc;
				}, {});

				return new Response(JSON.stringify({
					success: true,
					permissions: permissionsList,
					grouped_permissions: groupedPermissions,
					categories: [...new Set(permissionsList.map(p => p.category))],
					tiers: ['free', 'basic', 'pro', 'enterprise']
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			default:
				return new Response(JSON.stringify({
					error: 'Method Not Allowed',
					message: `Method ${method} is not allowed for permissions endpoint`
				}), {
					status: 405,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
		}
	} catch (error) {
		console.error('Permissions route error:', error);
		throw error;
	}
}

// 分析统计路由处理
async function handleAnalyticsRoutes(request: Request, db: any, corsHeaders: any, env: Env) {
	const url = new URL(request.url);
	const method = request.method;

	// 验证管理员权限
	const authResult = await validateAdminAccess(request, env);
	if (!authResult.valid) {
		return new Response(JSON.stringify({
			error: 'Unauthorized',
			message: authResult.error
		}), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		switch (method) {
			case 'GET':
				const days = parseInt(url.searchParams.get('days') || '30');
				const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

				// 基础统计
				const [totalUsers, totalApiKeys, activeApiKeys] = await Promise.all([
					db.select({ count: sql`count(*)` }).from(users),
					db.select({ count: sql`count(*)` }).from(apiKeys),
					db.select({ count: sql`count(*)` }).from(apiKeys).where(eq(apiKeys.status, 'active'))
				]);

				// API使用统计
				const apiUsageStats = await db.query.dailyUsageSummary.findMany({
					where: (dailyUsageSummary, { gte }) => gte(dailyUsageSummary.date, startDate),
					orderBy: [asc(dailyUsageSummary.date)]
				});

				// 按层级统计API密钥
				const tierStats = await db.select({
					tier: apiKeys.tier,
					count: sql`count(*)`
				})
				.from(apiKeys)
				.where(eq(apiKeys.status, 'active'))
				.groupBy(apiKeys.tier);

				// 最活跃的用户
				const topUsers = await db.select({
					userId: dailyUsageSummary.userId,
					totalRequests: sql`sum(${dailyUsageSummary.totalRequests})`
				})
				.from(dailyUsageSummary)
				.where(gte(dailyUsageSummary.date, startDate))
				.groupBy(dailyUsageSummary.userId)
				.orderBy(desc(sql`sum(${dailyUsageSummary.totalRequests})`))
				.limit(10);

				return new Response(JSON.stringify({
					success: true,
					analytics: {
						overview: {
							total_users: totalUsers[0]?.count || 0,
							total_api_keys: totalApiKeys[0]?.count || 0,
							active_api_keys: activeApiKeys[0]?.count || 0,
							period_days: days
						},
						tier_distribution: tierStats,
						usage_timeline: apiUsageStats.map(stat => ({
							date: stat.date,
							total_requests: stat.totalRequests,
							successful_requests: stat.successfulRequests,
							error_requests: stat.errorRequests,
							avg_response_time: stat.avgResponseTime
						})),
						top_users: topUsers
					}
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			default:
				return new Response(JSON.stringify({
					error: 'Method Not Allowed',
					message: `Method ${method} is not allowed for analytics endpoint`
				}), {
					status: 405,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
		}
	} catch (error) {
		console.error('Analytics route error:', error);
		throw error;
	}
}

// 应用申请管理路由处理
async function handleApplicationsRoutes(request: Request, db: any, corsHeaders: any, env: Env) {
	const url = new URL(request.url);
	const method = request.method;
	const pathSegments = url.pathname.split('/').filter(Boolean);
	const applicationId = pathSegments[4]; // /api/v2/admin/applications/{id}

	// 验证管理员权限
	const authResult = await validateAdminAccess(request, env);
	if (!authResult.valid) {
		return new Response(JSON.stringify({
			error: 'Unauthorized',
			message: authResult.error
		}), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		switch (method) {
			case 'GET':
				if (applicationId) {
					// 获取单个申请详情
					const application = await db.query.applications.findFirst({
						where: (applications, { eq }) => eq(applications.id, applicationId),
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									name: true,
									company: true
								}
							}
						}
					});

					if (!application) {
						return new Response(JSON.stringify({
							error: 'Not Found',
							message: 'Application not found'
						}), {
							status: 404,
							headers: { ...corsHeaders, 'Content-Type': 'application/json' }
						});
					}

					return new Response(JSON.stringify({
						success: true,
						application: {
							...application,
							requestedPermissions: JSON.parse(application.requestedPermissions || '[]')
						}
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				} else {
					// 获取申请列表
					const page = parseInt(url.searchParams.get('page') || '1');
					const limit = parseInt(url.searchParams.get('limit') || '20');
					const status = url.searchParams.get('status') || '';
					const type = url.searchParams.get('type') || '';
					
					const offset = (page - 1) * limit;
					
					let whereConditions = [];
					if (status) {
						whereConditions.push(eq(applications.status, status));
					}
					if (type) {
						whereConditions.push(eq(applications.type, type));
					}

					const applicationsList = await db.query.applications.findMany({
						where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									name: true,
									company: true
								}
							}
						},
						limit,
						offset,
						orderBy: [desc(applications.submittedAt)]
					});

					const totalQuery = await db.select({ count: sql`count(*)` })
						.from(applications)
						.where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
					const total = totalQuery[0]?.count || 0;

					return new Response(JSON.stringify({
						success: true,
						applications: applicationsList.map(app => ({
							...app,
							requestedPermissions: JSON.parse(app.requestedPermissions || '[]')
						})),
						pagination: {
							page,
							limit,
							total,
							pages: Math.ceil(total / limit),
							has_more: offset + limit < total
						}
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

			case 'PUT':
				// 审核申请
				if (!applicationId) {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'Application ID is required'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const reviewSchema = z.object({
					status: z.enum(['approved', 'rejected']),
					reviewComment: z.string().optional(),
					reviewedBy: z.string() // 审核员ID
				});

				const reviewData = reviewSchema.parse(await request.json());
				
				const applicationToReview = await db.query.applications.findFirst({
					where: (applications, { eq }) => eq(applications.id, applicationId)
				});
				
				if (!applicationToReview) {
					return new Response(JSON.stringify({
						error: 'Not Found',
						message: 'Application not found'
					}), {
						status: 404,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				if (applicationToReview.status !== 'pending') {
					return new Response(JSON.stringify({
						error: 'Bad Request',
						message: 'Application has already been reviewed'
					}), {
						status: 400,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				const updatedApplication = await db.update(applications)
					.set({
						status: reviewData.status,
						reviewComment: reviewData.reviewComment,
						reviewedBy: reviewData.reviewedBy,
						reviewedAt: Date.now()
					})
					.where(eq(applications.id, applicationId))
					.returning()
					.get();

				return new Response(JSON.stringify({
					success: true,
					message: `Application ${reviewData.status} successfully`,
					application: updatedApplication
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});

			default:
				return new Response(JSON.stringify({
					error: 'Method Not Allowed',
					message: `Method ${method} is not allowed for this endpoint`
				}), {
					status: 405,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
		}
	} catch (error) {
		console.error('Applications route error:', error);
		throw error;
	}
}
