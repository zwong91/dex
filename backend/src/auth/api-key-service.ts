import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, desc, asc, sql, gte, lte, inArray, count } from 'drizzle-orm';
import * as schema from '../database/schema';
import { createHash, randomBytes } from 'crypto';

// 权限常量定义
export const PERMISSIONS = {
  // DEX API 权限
  'dex:pools:read': { tier: 'free', description: '读取流动性池信息' },
  'dex:pools:write': { tier: 'pro', description: '管理流动性池' },
  'dex:analytics:read': { tier: 'free', description: '读取DEX分析数据' },
  'dex:analytics:advanced': { tier: 'basic', description: '高级分析数据' },
  'dex:user:read': { tier: 'basic', description: '读取用户数据' },
  'dex:user:write': { tier: 'pro', description: '修改用户数据' },
  'dex:events:read': { tier: 'basic', description: '读取事件数据' },
  'dex:realtime:subscribe': { tier: 'pro', description: '实时数据订阅' },
  
  // 管理权限
  'admin:sync:manage': { tier: 'enterprise', description: '管理数据同步' },
  'admin:pools:manage': { tier: 'enterprise', description: '管理池配置' },
  'admin:users:read': { tier: 'enterprise', description: '读取用户信息' },
  'admin:system:status': { tier: 'enterprise', description: '系统状态监控' },
} as const;

// Tier限制配置
export const TIER_LIMITS = {
  free: {
    requestsPerHour: 100,
    requestsPerDay: 1000,
    permissions: ['dex:pools:read', 'dex:analytics:read'],
    price: 0,
  },
  basic: {
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    permissions: ['dex:pools:read', 'dex:analytics:read', 'dex:analytics:advanced', 'dex:user:read', 'dex:events:read'],
    price: 29,
  },
  pro: {
    requestsPerHour: 5000,
    requestsPerDay: 100000,
    permissions: ['dex:pools:read', 'dex:pools:write', 'dex:analytics:read', 'dex:analytics:advanced', 'dex:user:read', 'dex:user:write', 'dex:events:read', 'dex:realtime:subscribe'],
    price: 99,
  },
  enterprise: {
    requestsPerHour: 20000,
    requestsPerDay: 500000,
    permissions: Object.keys(PERMISSIONS),
    price: 299,
  },
} as const;

export class ApiKeyService {
  private db: DrizzleD1Database<typeof schema>;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
  }

  /**
   * 生成新的API密钥
   */
  generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
    const key = `dex_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    const keyPrefix = `${key.substring(0, 8)}...`;
    
    return { key, keyHash, keyPrefix };
  }

  /**
   * 创建新用户
   */
  async createUser(userData: {
    email: string;
    username?: string;
    name?: string;
    company?: string;
    website?: string;
    walletAddress?: string;
  }): Promise<string> {
    try {
      const userId = await this.db.insert(schema.users).values({
        email: userData.email.toLowerCase(),
        username: userData.username,
        name: userData.name,
        company: userData.company,
        website: userData.website,
        walletAddress: userData.walletAddress?.toLowerCase(),
        status: 'pending',
        emailVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }).returning({ id: schema.users.id });

      // 创建免费订阅
      await this.db.insert(schema.subscriptions).values({
        userId: userId[0].id,
        tier: 'free',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return userId[0].id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * 验证用户邮箱
   */
  async verifyUserEmail(userId: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        emailVerified: true,
        status: 'active',
        updatedAt: Date.now(),
      })
      .where(eq(schema.users.id, userId));
  }

  /**
   * 申请API密钥
   */
  async applyForApiKey(userId: string, applicationData: {
    requestedTier: 'basic' | 'pro' | 'enterprise';
    reason: string;
    useCase?: string;
    expectedVolume?: string;
  }): Promise<string> {
    try {
      const application = await this.db.insert(schema.applications).values({
        userId,
        type: 'api_key',
        requestedTier: applicationData.requestedTier,
        reason: applicationData.reason,
        useCase: applicationData.useCase,
        expectedVolume: applicationData.expectedVolume,
        status: 'pending',
        submittedAt: Date.now(),
      }).returning({ id: schema.applications.id });

      return application[0].id;
    } catch (error) {
      console.error('Error creating API key application:', error);
      throw error;
    }
  }

  /**
   * 批准API密钥申请
   */
  async approveApiKeyApplication(
    applicationId: string, 
    reviewerId: string, 
    keyName: string,
    customPermissions?: string[]
  ): Promise<{ key: string; keyId: string }> {
    try {
      // 获取申请信息
      const application = await this.db
        .select()
        .from(schema.applications)
        .where(eq(schema.applications.id, applicationId))
        .limit(1);

      if (!application.length || application[0].status !== 'pending') {
        throw new Error('Application not found or already processed');
      }

      const app = application[0];
      const tier = app.requestedTier || 'free';
      const tierConfig = TIER_LIMITS[tier];

      // 生成API密钥
      const { key, keyHash, keyPrefix } = this.generateApiKey();

      // 确定权限
      const permissions = customPermissions || tierConfig.permissions;

      // 创建API密钥
      const apiKeyResult = await this.db.insert(schema.apiKeys).values({
        userId: app.userId,
        keyHash,
        keyPrefix,
        name: keyName,
        description: `${tier} tier API key`,
        tier,
        status: 'active',
        permissions: JSON.stringify(permissions),
        rateLimitPerHour: tierConfig.requestsPerHour,
        rateLimitPerDay: tierConfig.requestsPerDay,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }).returning({ id: schema.apiKeys.id });

      // 更新申请状态
      await this.db
        .update(schema.applications)
        .set({
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: Date.now(),
        })
        .where(eq(schema.applications.id, applicationId));

      // 更新用户订阅
      if (tier !== 'free') {
        await this.db
          .update(schema.subscriptions)
          .set({
            tier,
            updatedAt: Date.now(),
          })
          .where(eq(schema.subscriptions.userId, app.userId));
      }

      return { key, keyId: apiKeyResult[0].id };
    } catch (error) {
      console.error('Error approving API key application:', error);
      throw error;
    }
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(key: string): Promise<{
    isValid: boolean;
    userId?: string;
    keyId?: string;
    permissions?: string[];
    tier?: string;
    rateLimits?: { perHour: number; perDay: number };
  }> {
    try {
      const keyHash = createHash('sha256').update(key).digest('hex');

      const result = await this.db
        .select({
          apiKey: schema.apiKeys,
          user: schema.users,
          subscription: schema.subscriptions,
        })
        .from(schema.apiKeys)
        .leftJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
        .leftJoin(schema.subscriptions, eq(schema.apiKeys.userId, schema.subscriptions.userId))
        .where(
          and(
            eq(schema.apiKeys.keyHash, keyHash),
            eq(schema.apiKeys.status, 'active'),
            eq(schema.users.status, 'active')
          )
        )
        .limit(1);

      if (!result.length) {
        return { isValid: false };
      }

      const { apiKey, user, subscription } = result[0];

      // 检查密钥是否过期
      if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
        return { isValid: false };
      }

      // 更新最后使用时间
      await this.db
        .update(schema.apiKeys)
        .set({ lastUsedAt: Date.now() })
        .where(eq(schema.apiKeys.id, apiKey.id));

      return {
        isValid: true,
        userId: user?.id,
        keyId: apiKey.id,
        permissions: JSON.parse(apiKey.permissions || '[]'),
        tier: apiKey.tier,
        rateLimits: {
          perHour: apiKey.rateLimitPerHour || 100,
          perDay: apiKey.rateLimitPerDay || 1000,
        },
      };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { isValid: false };
    }
  }

  /**
   * 检查权限
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('admin:*');
  }

  /**
   * 记录API使用
   */
  async logApiUsage(data: {
    apiKeyId: string;
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime?: number;
    requestSize?: number;
    responseSize?: number;
    userAgent?: string;
    ipAddress?: string;
    chain?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const now = Date.now();
      const date = new Date(now).toISOString().split('T')[0];

      // 记录详细使用日志
      await this.db.insert(schema.apiUsage).values({
        apiKeyId: data.apiKeyId,
        userId: data.userId,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        requestSize: data.requestSize,
        responseSize: data.responseSize,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        chain: data.chain,
        errorMessage: data.errorMessage,
        timestamp: now,
        date,
      });

      // 更新每日汇总（异步处理）
      this.updateDailySummary(data.userId, data.apiKeyId, date, data).catch(error => {
        console.error('Error updating daily summary:', error);
      });
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  /**
   * 更新每日使用汇总
   */
  private async updateDailySummary(
    userId: string, 
    apiKeyId: string, 
    date: string, 
    usage: any
  ): Promise<void> {
    try {
      // 尝试更新现有记录
      const existing = await this.db
        .select()
        .from(schema.dailyUsageSummary)
        .where(
          and(
            eq(schema.dailyUsageSummary.userId, userId),
            eq(schema.dailyUsageSummary.apiKeyId, apiKeyId),
            eq(schema.dailyUsageSummary.date, date)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新现有记录
        const current = existing[0];
        await this.db
          .update(schema.dailyUsageSummary)
          .set({
            totalRequests: current.totalRequests + 1,
            successfulRequests: usage.statusCode < 400 ? current.successfulRequests + 1 : current.successfulRequests,
            errorRequests: usage.statusCode >= 400 ? current.errorRequests + 1 : current.errorRequests,
            totalResponseTime: current.totalResponseTime + (usage.responseTime || 0),
            avgResponseTime: (current.totalResponseTime + (usage.responseTime || 0)) / (current.totalRequests + 1),
            totalDataTransfer: current.totalDataTransfer + (usage.responseSize || 0),
            updatedAt: Date.now(),
          })
          .where(eq(schema.dailyUsageSummary.id, current.id));
      } else {
        // 创建新记录
        await this.db.insert(schema.dailyUsageSummary).values({
          userId,
          apiKeyId,
          date,
          totalRequests: 1,
          successfulRequests: usage.statusCode < 400 ? 1 : 0,
          errorRequests: usage.statusCode >= 400 ? 1 : 0,
          totalResponseTime: usage.responseTime || 0,
          avgResponseTime: usage.responseTime || 0,
          totalDataTransfer: usage.responseSize || 0,
          uniqueEndpoints: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error updating daily summary:', error);
    }
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit(apiKeyId: string, userId: string): Promise<{
    allowed: boolean;
    hourlyUsage: number;
    dailyUsage: number;
    hourlyLimit: number;
    dailyLimit: number;
  }> {
    try {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const today = new Date(now).toISOString().split('T')[0];

      // 获取API密钥信息
      const apiKey = await this.db
        .select()
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.id, apiKeyId))
        .limit(1);

      if (!apiKey.length) {
        return {
          allowed: false,
          hourlyUsage: 0,
          dailyUsage: 0,
          hourlyLimit: 0,
          dailyLimit: 0,
        };
      }

      const key = apiKey[0];

      // 检查小时限制
      const hourlyUsage = await this.db
        .select({ count: count() })
        .from(schema.apiUsage)
        .where(
          and(
            eq(schema.apiUsage.apiKeyId, apiKeyId),
            gte(schema.apiUsage.timestamp, oneHourAgo)
          )
        );

      // 检查每日限制
      const dailySummary = await this.db
        .select()
        .from(schema.dailyUsageSummary)
        .where(
          and(
            eq(schema.dailyUsageSummary.apiKeyId, apiKeyId),
            eq(schema.dailyUsageSummary.date, today)
          )
        )
        .limit(1);

      const dailyUsageCount = dailySummary.length > 0 ? dailySummary[0].totalRequests : 0;
      const hourlyUsageCount = hourlyUsage[0].count;

      const allowed = 
        hourlyUsageCount < (key.rateLimitPerHour || 100) &&
        dailyUsageCount < (key.rateLimitPerDay || 1000);

      return {
        allowed,
        hourlyUsage: hourlyUsageCount,
        dailyUsage: dailyUsageCount,
        hourlyLimit: key.rateLimitPerHour || 100,
        dailyLimit: key.rateLimitPerDay || 1000,
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        allowed: false,
        hourlyUsage: 0,
        dailyUsage: 0,
        hourlyLimit: 0,
        dailyLimit: 0,
      };
    }
  }

  /**
   * 获取用户的API密钥列表
   */
  async getUserApiKeys(userId: string): Promise<any[]> {
    try {
      const keys = await this.db
        .select({
          id: schema.apiKeys.id,
          name: schema.apiKeys.name,
          keyPrefix: schema.apiKeys.keyPrefix,
          tier: schema.apiKeys.tier,
          status: schema.apiKeys.status,
          permissions: schema.apiKeys.permissions,
          rateLimitPerHour: schema.apiKeys.rateLimitPerHour,
          rateLimitPerDay: schema.apiKeys.rateLimitPerDay,
          lastUsedAt: schema.apiKeys.lastUsedAt,
          createdAt: schema.apiKeys.createdAt,
          expiresAt: schema.apiKeys.expiresAt,
        })
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.userId, userId))
        .orderBy(desc(schema.apiKeys.createdAt));

      return keys.map(key => ({
        ...key,
        permissions: JSON.parse(key.permissions || '[]'),
      }));
    } catch (error) {
      console.error('Error getting user API keys:', error);
      throw error;
    }
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    await this.db
      .update(schema.apiKeys)
      .set({
        status: 'revoked',
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(schema.apiKeys.id, keyId),
          eq(schema.apiKeys.userId, userId)
        )
      );
  }
}

export function createApiKeyService(db: DrizzleD1Database<typeof schema>): ApiKeyService {
  return new ApiKeyService(db);
}
