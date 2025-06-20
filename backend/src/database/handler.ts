import { drizzle } from "drizzle-orm/d1";
import { json } from "itty-router-extras";
import { ZodError, z } from "zod";
import { users, apiKeys, permissions, subscriptions, applications, apiUsage } from "./schema";
import * as schema from "./schema";
import { and, eq, sql, desc, asc } from "drizzle-orm";
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

// 生成API密钥哈希的辅助函数
function hashApiKey(key: string): string {
	// 简化版哈希 - 生产环境应使用更安全的哈希算法
	return `sha256-${key}`;
}

export async function databaseHandler(request: Request, env: Env): Promise<Response> {
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

	// Authentication check - 使用环境变量中的KEY进行简单验证
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || authHeader !== `Bearer ${env.KEY}`) {
		return new Response(JSON.stringify({ 
			error: "Unauthorized", 
			message: "Valid authorization required for database operations" 
		}), { 
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
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
		if (path === "/api/sandbox") {
			if (method === "GET") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.sandbox.findFirst({
						where: (sandbox, { eq }) => eq(sandbox.id, id),
						with: {
							usersToSandboxes: true,
						},
					});
					return json(res ?? {});
				} else {
					const res = await db.select().from(sandbox).all();
					return json(res ?? {});
				}
			} else if (method === "DELETE") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					await db
						.delete(usersToSandboxes)
						.where(eq(usersToSandboxes.sandboxId, id));
					await db.delete(sandbox).where(eq(sandbox.id, id));

					// Call storage service to delete files
					// In a serverless environment, we would make an HTTP request
					// For now, we'll skip the internal call to avoid circular imports
					console.log(`Would delete storage for sandbox: ${id}`);

					return success;
				} else {
					return invalidRequest;
				}
			} else if (method === "POST") {
				const postSchema = z.object({
					id: z.string(),
					name: z.string().optional(),
					visibility: z.enum(["public", "private"]).optional(),
				});

				const body = await request.json();
				const { id, name, visibility } = postSchema.parse(body);
				const sb = await db
					.update(sandbox)
					.set({ name, visibility })
					.where(eq(sandbox.id, id))
					.returning()
					.get();

				return success;
			} else if (method === "PUT") {
				const initSchema = z.object({
					type: z.enum(["react", "node"]),
					name: z.string(),
					userId: z.string(),
					visibility: z.enum(["public", "private"]),
				});

				const body = await request.json();
				const { type, name, userId, visibility } = initSchema.parse(body);

				const userSandboxes = await db
					.select()
					.from(sandbox)
					.where(eq(sandbox.userId, userId))
					.all();

				if (userSandboxes.length >= 8) {
					return new Response("You reached the maximum # of sandboxes.", {
						status: 400,
					});
				}

				const sb = await db
					.insert(sandbox)
					.values({ type, name, userId, visibility, createdAt: new Date() })
					.returning()
					.get();

				// Initialize storage
				// In a serverless environment, we would make an HTTP request
				// For now, we'll skip the internal call to avoid circular imports
				console.log(`Would initialize storage for sandbox: ${sb.id}, type: ${type}`);

				return new Response(sb.id, { status: 200 });
			} else {
				return methodNotAllowed;
			}
		} else if (path === "/api/sandbox/share") {
			if (method === "GET") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.usersToSandboxes.findMany({
						where: (uts, { eq }) => eq(uts.userId, id),
					});

					const owners = await Promise.all(
						res.map(async (r) => {
							const sb = await db.query.sandbox.findFirst({
								where: (sandbox, { eq }) => eq(sandbox.id, r.sandboxId),
								with: {
									author: true,
								},
							});
							if (!sb) return;
							return {
								id: sb.id,
								name: sb.name,
								type: sb.type,
								author: sb.author.name,
								sharedOn: r.sharedOn,
							};
						})
					);

					return json(owners ?? {});
				} else return invalidRequest;
			} else if (method === "POST") {
				const shareSchema = z.object({
					sandboxId: z.string(),
					email: z.string(),
				});

				const body = await request.json();
				const { sandboxId, email } = shareSchema.parse(body);

				const user = await db.query.user.findFirst({
					where: (user, { eq }) => eq(user.email, email),
					with: {
						sandbox: true,
						usersToSandboxes: true,
					},
				});

				if (!user) {
					return new Response("No user associated with email.", { status: 400 });
				}

				if (user.sandbox.find((sb) => sb.id === sandboxId)) {
					return new Response("Cannot share with yourself!", { status: 400 });
				}

				if (user.usersToSandboxes.find((uts) => uts.sandboxId === sandboxId)) {
					return new Response("User already has access.", { status: 400 });
				}

				await db
					.insert(usersToSandboxes)
					.values({ userId: user.id, sandboxId, sharedOn: new Date() })
					.get();

				return success;
			} else if (method === "DELETE") {
				const deleteShareSchema = z.object({
					sandboxId: z.string(),
					userId: z.string(),
				});

				const body = await request.json();
				const { sandboxId, userId } = deleteShareSchema.parse(body);

				await db
					.delete(usersToSandboxes)
					.where(
						and(
							eq(usersToSandboxes.userId, userId),
							eq(usersToSandboxes.sandboxId, sandboxId)
						)
					);

				return success;
			} else return methodNotAllowed;
		} else if (path === "/api/sandbox/generate" && method === "POST") {
			const generateSchema = z.object({
				userId: z.string(),
			});
			const body = await request.json();
			const { userId } = generateSchema.parse(body);

			const dbUser = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.id, userId),
			});
			if (!dbUser) {
				return new Response("User not found.", { status: 400 });
			}
			if (dbUser.generations !== null && dbUser.generations >= 10) {
				return new Response("You reached the maximum # of generations.", {
					status: 400,
				});
			}

			await db
				.update(user)
				.set({ generations: sql`${user.generations} + 1` })
				.where(eq(user.id, userId))
				.get();

			return success;
		} else if (path === "/api/user") {
			if (method === "GET") {
				const params = url.searchParams;

				if (params.has("id")) {
					const id = params.get("id") as string;
					const res = await db.query.user.findFirst({
						where: (user, { eq }) => eq(user.id, id),
						with: {
							sandbox: {
								orderBy: (sandbox, { desc }) => [desc(sandbox.createdAt)],
							},
							usersToSandboxes: true,
						},
					});
					return json(res ?? {});
				} else {
					const res = await db.select().from(user).all();
					return json(res ?? {});
				}
			} else if (method === "POST") {
				const userSchema = z.object({
					id: z.string(),
					name: z.string(),
					email: z.string().email(),
				});

				const body = await request.json();
				const { id, name, email } = userSchema.parse(body);

				const res = await db
					.insert(user)
					.values({ id, name, email })
					.returning()
					.get();
				return json({ res });
			} else if (method === "DELETE") {
				const params = url.searchParams;
				if (params.has("id")) {
					const id = params.get("id") as string;
					await db.delete(user).where(eq(user.id, id));
					return success;
				} else return invalidRequest;
			} else {
				return methodNotAllowed;
			}
		} else {
			return notFound;
		}
	} catch (error) {
		console.error('Database error:', error);
		if (error instanceof ZodError) {
			return json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
		}
		return json({ error: 'Database service error' }, { status: 500 });
	}
}
