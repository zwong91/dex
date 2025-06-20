/**
 * V2 Database Handler - 简化版本支持基本的用户和API密钥CRUD操作
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
	name: z.string().min(1).max(100),
	company: z.string().optional(),
	website: z.string().url().optional(),
	bio: z.string().max(500).optional()
});

const updateUserSchema = z.object({
	username: z.string().min(3).max(50).optional(),
	email: z.string().email().optional(),
	name: z.string().min(1).max(100).optional(),
	company: z.string().optional(),
	website: z.string().url().optional(),
	bio: z.string().max(500).optional(),
	status: z.enum(["active", "suspended", "pending"]).optional()
});

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

// 验证管理员权限
async function validateAdminAccess(request: Request, env: Env): Promise<{ valid: boolean; error?: string }> {
	const authHeader = request.headers.get("Authorization");
	
	// 支持Bearer token认证
	if (authHeader && authHeader === `Bearer ${env.KEY}`) {
		return { valid: true };
	}
	
	return { valid: false, error: "Unauthorized access" };
}

// ============================================================================
// 主路由处理器
// ============================================================================

export async function databaseHandler(request: Request, env: Env): Promise<Response> {
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
						// 列出所有API密钥（支持分页和搜索）
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
						
						const keys = await db.select()
							.from(apiKeys)
							.where(whereClause)
							.limit(limit)
							.offset(offset)
							.orderBy(desc(apiKeys.createdAt));
						
						// 获取总数
						const totalResult = await db.select({ count: sql`count(*)` })
							.from(apiKeys)
							.where(whereClause);
						const total = Number(totalResult[0]?.count || 0);
						
						return jsonResponse({ 
							success: true, 
							data: keys.map(key => ({
								...key,
								permissions: JSON.parse(key.permissions || "[]")
							})),
							pagination: {
								page,
								limit,
								total,
								pages: Math.ceil(total / limit)
							}
						});
					}
					if (method === "POST") {
						// 创建新API密钥
						try {
							const body = await request.json();
							const createData = createApiKeySchema.parse(body);
							
							// 检查用户是否存在
							const userExists = await db.select().from(users).where(eq(users.id, createData.userId)).limit(1);
							if (userExists.length === 0) {
								return errorResponse("User not found", 404);
							}
							
							const apiKey = generateApiKey();
							const keyId = generateId('key_');
							const now = new Date();
							
							const newApiKey = {
								id: keyId,
								userId: createData.userId,
								keyHash: hashApiKey(apiKey),
								keyPrefix: apiKey.substring(0, 8) + '...',
								name: createData.name,
								description: createData.description || null,
								tier: createData.tier,
								status: 'active' as const,
								permissions: JSON.stringify(createData.permissions),
								rateLimitPerHour: createData.rateLimitPerHour,
								rateLimitPerDay: createData.rateLimitPerDay,
								allowedIps: null,
								allowedDomains: null,
								expiresAt: null,
								lastUsedAt: null,
								createdAt: now,
								updatedAt: now
							};
							
							await db.insert(apiKeys).values(newApiKey);
							
							return jsonResponse({ 
								success: true, 
								data: { 
									...newApiKey, 
									permissions: createData.permissions,
									apiKey: apiKey // 只在创建时返回完整密钥
								} 
							}, 201);
						} catch (error) {
							if (error instanceof ZodError) {
								return jsonResponse({ 
									error: 'Invalid request data', 
									details: error.errors 
								}, 400);
							}
							throw error;
						}
					}
				} else {
					if (method === "GET") {
						const key = await db.select().from(apiKeys).where(eq(apiKeys.id, resourceId)).limit(1);
						if (key.length === 0 || !key[0]) return errorResponse("API key not found", 404);
						const keyData = key[0];
						return jsonResponse({ 
							success: true, 
							data: { 
								...keyData, 
								permissions: JSON.parse(keyData.permissions || "[]") 
							} 
						});
					}
					if (method === "PUT") {
						// 更新API密钥
						try {
							const body = await request.json();
							const updateData = updateApiKeySchema.parse(body);
							
							// 检查API密钥是否存在
							const existingKey = await db.select().from(apiKeys).where(eq(apiKeys.id, resourceId)).limit(1);
							if (existingKey.length === 0) {
								return errorResponse("API key not found", 404);
							}
							
							const updateFields: any = {
								updatedAt: new Date()
							};
							
							if (updateData.name) updateFields.name = updateData.name;
							if (updateData.description !== undefined) updateFields.description = updateData.description;
							if (updateData.status) updateFields.status = updateData.status;
							if (updateData.permissions) updateFields.permissions = JSON.stringify(updateData.permissions);
							if (updateData.rateLimitPerHour) updateFields.rateLimitPerHour = updateData.rateLimitPerHour;
							if (updateData.rateLimitPerDay) updateFields.rateLimitPerDay = updateData.rateLimitPerDay;
							
							await db.update(apiKeys)
								.set(updateFields)
								.where(eq(apiKeys.id, resourceId));
							
							// 获取更新后的数据
							const updatedKey = await db.select().from(apiKeys).where(eq(apiKeys.id, resourceId)).limit(1);
							if (updatedKey.length === 0 || !updatedKey[0]) {
								return errorResponse("Failed to retrieve updated API key", 500);
							}
							const keyData = updatedKey[0];
							
							return jsonResponse({ 
								success: true, 
								data: { 
									...keyData, 
									permissions: JSON.parse(keyData.permissions || "[]") 
								} 
							});
						} catch (error) {
							if (error instanceof ZodError) {
								return jsonResponse({ 
									error: 'Invalid request data', 
									details: error.errors 
								}, 400);
							}
							throw error;
						}
					}
					if (method === "DELETE") {
						// 删除API密钥（软删除，将状态设为revoked）
						const existingKey = await db.select().from(apiKeys).where(eq(apiKeys.id, resourceId)).limit(1);
						if (existingKey.length === 0) {
							return errorResponse("API key not found", 404);
						}
						
						await db.update(apiKeys)
							.set({ 
								status: 'revoked',
								updatedAt: new Date()
							})
							.where(eq(apiKeys.id, resourceId));
						
						return jsonResponse({ 
							success: true, 
							message: "API key revoked successfully" 
						});
					}
				}
				break;
				
			case "users":
				if (!resourceId) {
					if (method === "GET") {
						// 列出所有用户（支持分页和搜索）
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
									like(users.name, `%${search}%`)
								)
							);
						}
						if (status && ["active", "suspended", "pending"].includes(status)) {
							whereConditions.push(eq(users.status, status as any));
						}
						
						const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
						
						const usersList = await db.select()
							.from(users)
							.where(whereClause)
							.limit(limit)
							.offset(offset)
							.orderBy(desc(users.createdAt));
						
						// 获取总数
						const totalResult = await db.select({ count: sql`count(*)` })
							.from(users)
							.where(whereClause);
						const total = Number(totalResult[0]?.count || 0);
						
						return jsonResponse({ 
							success: true, 
							data: usersList,
							pagination: {
								page,
								limit,
								total,
								pages: Math.ceil(total / limit)
							}
						});
					}
					if (method === "POST") {
						// 创建新用户
						try {
							const body = await request.json();
							const createData = createUserSchema.parse(body);
							
							// 检查邮箱是否已存在
							const emailExists = await db.select().from(users).where(eq(users.email, createData.email)).limit(1);
							if (emailExists.length > 0) {
								return errorResponse("Email already exists", 409);
							}
							
							// 检查用户名是否已存在
							const usernameExists = await db.select().from(users).where(eq(users.username, createData.username)).limit(1);
							if (usernameExists.length > 0) {
								return errorResponse("Username already exists", 409);
							}
							
							const userId = generateId('user_');
							const now = new Date();
							
							const newUser = {
								id: userId,
								email: createData.email,
								username: createData.username,
								name: createData.name,
								avatar: null,
								company: createData.company || null,
								website: createData.website || null,
								bio: createData.bio || null,
								walletAddress: null,
								status: 'active' as const,
								emailVerified: false,
								createdAt: now,
								updatedAt: now,
								lastLoginAt: null
							};
							
							await db.insert(users).values(newUser);
							
							return jsonResponse({ 
								success: true, 
								data: newUser 
							}, 201);
						} catch (error) {
							if (error instanceof ZodError) {
								return jsonResponse({ 
									error: 'Invalid request data', 
									details: error.errors 
								}, 400);
							}
							throw error;
						}
					}
				} else {
					if (method === "GET") {
						const user = await db.select().from(users).where(eq(users.id, resourceId)).limit(1);
						if (user.length === 0 || !user[0]) return errorResponse("User not found", 404);
						return jsonResponse({ success: true, data: user[0] });
					}
					if (method === "PUT") {
						// 更新用户
						try {
							const body = await request.json();
							const updateData = updateUserSchema.parse(body);
							
							// 检查用户是否存在
							const existingUser = await db.select().from(users).where(eq(users.id, resourceId)).limit(1);
							if (existingUser.length === 0) {
								return errorResponse("User not found", 404);
							}
							
							// 如果更新邮箱，检查是否与其他用户冲突
							if (updateData.email) {
								const emailExists = await db.select().from(users)
									.where(and(eq(users.email, updateData.email), not(eq(users.id, resourceId))))
									.limit(1);
								if (emailExists.length > 0) {
									return errorResponse("Email already exists", 409);
								}
							}
							
							// 如果更新用户名，检查是否与其他用户冲突
							if (updateData.username) {
								const usernameExists = await db.select().from(users)
									.where(and(eq(users.username, updateData.username), not(eq(users.id, resourceId))))
									.limit(1);
								if (usernameExists.length > 0) {
									return errorResponse("Username already exists", 409);
								}
							}
							
							const updateFields: any = {
								updatedAt: new Date()
							};
							
							if (updateData.email) updateFields.email = updateData.email;
							if (updateData.username) updateFields.username = updateData.username;
							if (updateData.name) updateFields.name = updateData.name;
							if (updateData.company !== undefined) updateFields.company = updateData.company;
							if (updateData.website !== undefined) updateFields.website = updateData.website;
							if (updateData.bio !== undefined) updateFields.bio = updateData.bio;
							if (updateData.status) updateFields.status = updateData.status;
							
							await db.update(users)
								.set(updateFields)
								.where(eq(users.id, resourceId));
							
							// 获取更新后的数据
							const updatedUser = await db.select().from(users).where(eq(users.id, resourceId)).limit(1);
							if (updatedUser.length === 0 || !updatedUser[0]) {
								return errorResponse("Failed to retrieve updated user", 500);
							}
							
							return jsonResponse({ 
								success: true, 
								data: updatedUser[0] 
							});
						} catch (error) {
							if (error instanceof ZodError) {
								return jsonResponse({ 
									error: 'Invalid request data', 
									details: error.errors 
								}, 400);
							}
							throw error;
						}
					}
					if (method === "DELETE") {
						// 删除用户（软删除，将状态设为suspended）
						const existingUser = await db.select().from(users).where(eq(users.id, resourceId)).limit(1);
						if (existingUser.length === 0) {
							return errorResponse("User not found", 404);
						}
						
						// 先撤销用户的所有API密钥
						await db.update(apiKeys)
							.set({ 
								status: 'revoked',
								updatedAt: new Date()
							})
							.where(eq(apiKeys.userId, resourceId));
						
						// 然后暂停用户账户
						await db.update(users)
							.set({ 
								status: 'suspended',
								updatedAt: new Date()
							})
							.where(eq(users.id, resourceId));
						
						return jsonResponse({ 
							success: true, 
							message: "User suspended and all API keys revoked" 
						});
					}
				}
				break;
				
			case "permissions":
				if (method === "GET") {
					const permissionsList = await db.select().from(permissions).limit(100);
					return jsonResponse({ success: true, data: permissionsList });
				}
				break;
				
			case "analytics":
				if (method === "GET") {
					// 详细分析数据
					const totalUsers = await db.select({ count: sql`count(*)` }).from(users);
					const activeUsers = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.status, 'active'));
					const totalApiKeys = await db.select({ count: sql`count(*)` }).from(apiKeys);
					const activeApiKeys = await db.select({ count: sql`count(*)` }).from(apiKeys).where(eq(apiKeys.status, 'active'));
					const revokedApiKeys = await db.select({ count: sql`count(*)` }).from(apiKeys).where(eq(apiKeys.status, 'revoked'));
					
					// 按层级统计API密钥
					const tierStats = await db.select({
						tier: apiKeys.tier,
						count: sql`count(*)`
					}).from(apiKeys).groupBy(apiKeys.tier);
					
					// 近期注册用户（最近7天）
					const sevenDaysAgo = new Date();
					sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
					const recentUsers = await db.select({ count: sql`count(*)` })
						.from(users)
						.where(gte(users.createdAt, sevenDaysAgo));
					
					// 近期创建的API密钥（最近7天）
					const recentApiKeys = await db.select({ count: sql`count(*)` })
						.from(apiKeys)
						.where(gte(apiKeys.createdAt, sevenDaysAgo));
					
					return jsonResponse({ 
						success: true, 
						data: {
							users: {
								total: Number(totalUsers[0]?.count || 0),
								active: Number(activeUsers[0]?.count || 0),
								recent_registrations: Number(recentUsers[0]?.count || 0)
							},
							api_keys: {
								total: Number(totalApiKeys[0]?.count || 0),
								active: Number(activeApiKeys[0]?.count || 0),
								revoked: Number(revokedApiKeys[0]?.count || 0),
								recent_created: Number(recentApiKeys[0]?.count || 0),
								by_tier: tierStats.reduce((acc: any, stat: any) => {
									acc[stat.tier] = Number(stat.count);
									return acc;
								}, {})
							},
							usage_statistics: {
								requests_today: 0, // TODO: implement with usage tracking
								requests_this_month: 0 // TODO: implement with usage tracking
							}
						}
					});
				}
				break;
				
			case "applications":
				if (method === "GET") {
					const applicationsList = await db.select().from(applications).limit(50);
					return jsonResponse({ success: true, data: applicationsList });
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
