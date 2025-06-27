import { Hono } from 'hono';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { users, apiKeys, permissions, applications } from './schema';
import * as schema from './schema';
import { and, eq, sql, desc, like, or, gte, not } from 'drizzle-orm';
import { createAuthMiddleware } from '../middleware/auth';
import type { Env } from '../index';

function generateApiKey(): string {
  const prefix = 'dex_';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}_${random}`;
}

function hashApiKey(key: string): string {
  return `sha256-${key}-hash`;
}

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

export function createDBRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // 认证中间件
  app.use('*', createAuthMiddleware());

  // 用户相关
  app.get('/users', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const url = new URL(c.req.url);
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
      const totalResult = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(whereClause);
      const total = Number(totalResult[0]?.count || 0);
      return c.json({
        success: true,
        data: usersList,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.post('/users', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const body = await c.req.json();
      const createData = createUserSchema.parse(body);
      const emailExists = await db.select().from(users).where(eq(users.email, createData.email)).limit(1);
      if (emailExists.length > 0) return c.json({ error: "Email already exists" }, 409);
      const usernameExists = await db.select().from(users).where(eq(users.username, createData.username)).limit(1);
      if (usernameExists.length > 0) return c.json({ error: "Username already exists" }, 409);
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
      return c.json({ success: true, data: newUser }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request data', details: error.errors }, 400);
      }
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.get('/users/:id', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const user = await db.select().from(users).where(eq(users.id, c.req.param('id'))).limit(1);
      if (user.length === 0 || !user[0]) return c.json({ error: "User not found" }, 404);
      return c.json({ success: true, data: user[0] });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.put('/users/:id', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const body = await c.req.json();
      const updateData = updateUserSchema.parse(body);
      const existingUser = await db.select().from(users).where(eq(users.id, c.req.param('id'))).limit(1);
      if (existingUser.length === 0) return c.json({ error: "User not found" }, 404);
      if (updateData.email) {
        const emailExists = await db.select().from(users)
          .where(and(eq(users.email, updateData.email), not(eq(users.id, c.req.param('id')))))
          .limit(1);
        if (emailExists.length > 0) return c.json({ error: "Email already exists" }, 409);
      }
      if (updateData.username) {
        const usernameExists = await db.select().from(users)
          .where(and(eq(users.username, updateData.username), not(eq(users.id, c.req.param('id')))))
          .limit(1);
        if (usernameExists.length > 0) return c.json({ error: "Username already exists" }, 409);
      }
      const updateFields: any = { updatedAt: new Date() };
      if (updateData.email) updateFields.email = updateData.email;
      if (updateData.username) updateFields.username = updateData.username;
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.company !== undefined) updateFields.company = updateData.company;
      if (updateData.website !== undefined) updateFields.website = updateData.website;
      if (updateData.bio !== undefined) updateFields.bio = updateData.bio;
      if (updateData.status) updateFields.status = updateData.status;
      await db.update(users).set(updateFields).where(eq(users.id, c.req.param('id')));
      const updatedUser = await db.select().from(users).where(eq(users.id, c.req.param('id'))).limit(1);
      if (updatedUser.length === 0 || !updatedUser[0]) return c.json({ error: "Failed to retrieve updated user" }, 500);
      return c.json({ success: true, data: updatedUser[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request data', details: error.errors }, 400);
      }
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.delete('/users/:id', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const existingUser = await db.select().from(users).where(eq(users.id, c.req.param('id'))).limit(1);
      if (existingUser.length === 0) return c.json({ error: "User not found" }, 404);
      await db.update(apiKeys).set({ status: 'revoked', updatedAt: new Date() }).where(eq(apiKeys.userId, c.req.param('id')));
      await db.update(users).set({ status: 'suspended', updatedAt: new Date() }).where(eq(users.id, c.req.param('id')));
      return c.json({ success: true, message: "User suspended and all API keys revoked" });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  // API Key 相关
  app.get('/api-keys', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const url = new URL(c.req.url);
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
      const totalResult = await db.select({ count: sql`count(*)` })
        .from(apiKeys)
        .where(whereClause);
      const total = Number(totalResult[0]?.count || 0);
      return c.json({
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
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.post('/api-keys', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const body = await c.req.json();
      const createData = createApiKeySchema.parse(body);
      const userExists = await db.select().from(users).where(eq(users.id, createData.userId)).limit(1);
      if (userExists.length === 0) return c.json({ error: "User not found" }, 404);
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
      return c.json({
        success: true,
        data: {
          ...newApiKey,
          permissions: createData.permissions,
          apiKey: apiKey
        }
      }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request data', details: error.errors }, 400);
      }
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.get('/api-keys/:id', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const key = await db.select().from(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).limit(1);
      if (key.length === 0 || !key[0]) return c.json({ error: "API key not found" }, 404);
      const keyData = key[0];
      return c.json({
        success: true,
        data: {
          ...keyData,
          permissions: JSON.parse(keyData.permissions || "[]")
        }
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.put('/api-keys/:id', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const body = await c.req.json();
      const updateData = updateApiKeySchema.parse(body);
      const existingKey = await db.select().from(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).limit(1);
      if (existingKey.length === 0) return c.json({ error: "API key not found" }, 404);
      const updateFields: any = { updatedAt: new Date() };
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.status) updateFields.status = updateData.status;
      if (updateData.permissions) updateFields.permissions = JSON.stringify(updateData.permissions);
      if (updateData.rateLimitPerHour) updateFields.rateLimitPerHour = updateData.rateLimitPerHour;
      if (updateData.rateLimitPerDay) updateFields.rateLimitPerDay = updateData.rateLimitPerDay;
      await db.update(apiKeys).set(updateFields).where(eq(apiKeys.id, c.req.param('id')));
      const updatedKey = await db.select().from(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).limit(1);
      if (updatedKey.length === 0 || !updatedKey[0]) return c.json({ error: "Failed to retrieve updated API key" }, 500);
      const keyData = updatedKey[0];
      return c.json({
        success: true,
        data: {
          ...keyData,
          permissions: JSON.parse(keyData.permissions || "[]")
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid request data', details: error.errors }, 400);
      }
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
  app.delete('/api-keys/:id', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const existingKey = await db.select().from(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).limit(1);
      if (existingKey.length === 0) return c.json({ error: "API key not found" }, 404);
      await db.update(apiKeys).set({ status: 'revoked', updatedAt: new Date() }).where(eq(apiKeys.id, c.req.param('id')));
      return c.json({ success: true, message: "API key revoked successfully" });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });


  // 其它资源
  app.get('/permissions', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const permissionsList = await db.select().from(permissions).limit(100);
      return c.json({ success: true, data: permissionsList });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  app.get('/analytics', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const totalUsers = await db.select({ count: sql`count(*)` }).from(users);
      const activeUsers = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.status, 'active'));
      const totalApiKeys = await db.select({ count: sql`count(*)` }).from(apiKeys);
      const activeApiKeys = await db.select({ count: sql`count(*)` }).from(apiKeys).where(eq(apiKeys.status, 'active'));
      const revokedApiKeys = await db.select({ count: sql`count(*)` }).from(apiKeys).where(eq(apiKeys.status, 'revoked'));
      const tierStats = await db.select({ tier: apiKeys.tier, count: sql`count(*)` }).from(apiKeys).groupBy(apiKeys.tier);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentUsers = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(gte(users.createdAt, sevenDaysAgo));
      const recentApiKeys = await db.select({ count: sql`count(*)` })
        .from(apiKeys)
        .where(gte(apiKeys.createdAt, sevenDaysAgo));
      return c.json({
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
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  app.get('/applications', async (c) => {
    try {
      const env = c.env;
      if (!env.D1_DATABASE) return c.json({ error: 'Database unavailable' }, 503);
      const db = drizzle(env.D1_DATABASE, { schema });
      const applicationsList = await db.select().from(applications).limit(50);
      return c.json({ success: true, data: applicationsList });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  // fallback: 兼容所有未列出的 /admin/* 路由
  app.all('/*', (c) => c.json({ error: 'Not implemented' }, 501));

  return app;
}
