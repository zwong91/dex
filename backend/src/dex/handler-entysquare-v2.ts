import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { Env } from '../index';
import { DatabaseService, createDatabaseService } from './database-service';
import { SyncService, createSyncService } from './sync-service';
import { ApiKeyService, createApiKeyService } from '../auth/api-key-service';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

// Validation schemas
const chainParamSchema = z.enum(['binance', 'bsctest']);
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const timestampSchema = z.coerce.number().optional();
const paginationSchema = z.object({
  pageSize: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  orderBy: z.enum(['liquidity', 'volume', 'fees', 'name']).default('liquidity'),
  orderDirection: z.enum(['asc', 'desc']).default('desc')
});

// Types for API responses
interface TokenDetail {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  priceUsd?: number;
  priceNative?: string;
  logoURI?: string;
}

interface PoolInfo {
  pairAddress: string;
  chain: string;
  name: string;
  status: string;
  version: string;
  tokenX: TokenDetail;
  tokenY: TokenDetail;
  reserveX: string;
  reserveY: string;
  lbBinStep: number;
  activeBinId: number;
  liquidityUsd: number;
  volumeUsd: number;
  feesUsd: number;
  apy?: number;
}

interface DexAnalytics {
  date: string;
  timestamp: number;
  reserveUsd: number;
  volumeUsd: number;
  feesUsd: number;
  totalPools: number;
  activeUsers: number;
}

// 权限映射
const ENDPOINT_PERMISSIONS = {
  'GET /v1/dex/analytics': 'dex:analytics:read',
  'GET /v1/pools': 'dex:pools:read',
  'GET /v1/pools/:address': 'dex:pools:read',
  'GET /v1/user/bin-ids': 'dex:user:read',
  'GET /v1/user/pool-ids': 'dex:user:read',
  'GET /v1/user/balances': 'dex:user:read',
  'GET /v1/user/swap-history': 'dex:user:read',
  'GET /v1/user/liquidity-history': 'dex:user:read',
  'GET /v1/user/statistics': 'dex:user:read',
  'POST /v1/admin/sync/pool': 'admin:sync:manage',
  'POST /v1/admin/pools': 'admin:pools:manage',
  'POST /v1/admin/tokens': 'admin:pools:manage',
  'GET /v1/admin/sync/status': 'admin:system:status',
} as const;

// 定义 Context 类型扩展
interface CustomContext {
  apiValidation?: any;
  rateLimits?: any;
  startTime?: number;
}

export function createDexHandler(): Hono<{ Bindings: Env; Variables: CustomContext }> {
  const app = new Hono<{ Bindings: Env; Variables: CustomContext }>();

  // CORS middleware
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  }));

  // Helper functions
  function getDatabaseService(c: any): DatabaseService {
    const db = drizzle(c.env.D1_DATABASE, { schema });
    return createDatabaseService(db);
  }

  function getSyncService(c: any): SyncService {
    const db = drizzle(c.env.D1_DATABASE, { schema });
    return createSyncService(db);
  }

  function getApiKeyService(c: any): ApiKeyService {
    const db = drizzle(c.env.D1_DATABASE, { schema });
    return createApiKeyService(db);
  }

  // API Key validation and permission middleware
  app.use('/v1/*', async (c, next) => {
    const apiKey = c.req.header('x-api-key');
    
    if (!apiKey) {
      return c.json({ 
        error: 'Missing x-api-key header',
        message: 'Please provide a valid API key. Visit our dashboard to generate one.'
      }, 401);
    }

    try {
      const apiKeyService = getApiKeyService(c);
      
      // 验证API密钥
      const validation = await apiKeyService.validateApiKey(apiKey);
      
      if (!validation.isValid) {
        return c.json({ 
          error: 'Invalid API key',
          message: 'The provided API key is invalid, expired, or revoked.'
        }, 401);
      }

      // 检查速率限制
      const rateLimit = await apiKeyService.checkRateLimit(validation.keyId!, validation.userId!);
      
      if (!rateLimit.allowed) {
        return c.json({
          error: 'Rate limit exceeded',
          message: `Rate limit exceeded. Hourly: ${rateLimit.hourlyUsage}/${rateLimit.hourlyLimit}, Daily: ${rateLimit.dailyUsage}/${rateLimit.dailyLimit}`,
          limits: {
            hourly: { used: rateLimit.hourlyUsage, limit: rateLimit.hourlyLimit },
            daily: { used: rateLimit.dailyUsage, limit: rateLimit.dailyLimit }
          }
        }, 429);
      }

      // 检查权限
      const method = c.req.method;
      const path = c.req.path.replace(/\/[^\/]+$/, '/:param').replace(/\/v1/, ''); // 简化路径匹配
      const endpointKey = `${method} ${path}` as keyof typeof ENDPOINT_PERMISSIONS;
      const requiredPermission = ENDPOINT_PERMISSIONS[endpointKey];

      if (requiredPermission && !apiKeyService.hasPermission(validation.permissions!, requiredPermission)) {
        return c.json({
          error: 'Insufficient permissions',
          message: `This endpoint requires the '${requiredPermission}' permission. Please upgrade your plan or contact support.`,
          required: requiredPermission,
          userPermissions: validation.permissions
        }, 403);
      }

      // 在context中存储验证信息
      c.set('apiValidation', validation);
      c.set('rateLimits', rateLimit);

      await next();

      // 记录API使用（在响应后异步处理）
      const responseTime = Date.now() - (c.get('startTime') || Date.now());
      
      apiKeyService.logApiUsage({
        apiKeyId: validation.keyId!,
        userId: validation.userId!,
        endpoint: c.req.path,
        method: c.req.method,
        statusCode: c.res.status || 200,
        responseTime,
        userAgent: c.req.header('user-agent'),
        ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
        chain: c.req.param('chain'),
      }).catch(error => {
        console.error('Error logging API usage:', error);
      });

    } catch (error: any) {
      console.error('API key validation error:', error);
      return c.json({ 
        error: 'Authentication error',
        message: 'An error occurred while validating your API key.'
      }, 500);
    }
  });

  // 添加请求开始时间
  app.use('*', async (c, next) => {
    c.set('startTime', Date.now());
    await next();
  });

  // 1. 📊 DEX Analytics - Get exchange analytics data
  app.get('/v1/dex/analytics/:chain', async (c) => {
    try {
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const startTime = timestampSchema.parse(c.req.query('startTime'));
      const endTime = timestampSchema.parse(c.req.query('endTime'));

      const dbService = getDatabaseService(c);
      const analytics = await dbService.getDexAnalytics(chain, {
        startTime,
        endTime,
        interval: 'day'
      });

      // Format as array for compatibility
      const result: DexAnalytics[] = [{
        date: new Date().toISOString().split('T')[0] || new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
        reserveUsd: analytics.totalLiquidityUsd,
        volumeUsd: analytics.volume24hUsd,
        feesUsd: analytics.fees24hUsd,
        totalPools: analytics.totalPools,
        activeUsers: 0 // TODO: calculate from user activity
      }];

      return c.json(result);
    } catch (error: any) {
      console.error('Analytics error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 2. 🏊 Pools - List liquidity pools
  app.get('/v1/pools/:chain', async (c) => {
    try {
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const pagination = paginationSchema.parse({
        pageSize: c.req.query('pageSize'),
        page: c.req.query('page'),
        orderBy: c.req.query('orderBy'),
        orderDirection: c.req.query('orderDirection')
      });
      const search = c.req.query('search');
      const status = c.req.query('status') || 'all';

      const dbService = getDatabaseService(c);
      const result = await dbService.getPools({
        chain,
        pageSize: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        orderBy: pagination.orderBy,
        orderDirection: pagination.orderDirection,
        search
      });

      // Filter by status if specified
      let pools = result.pools;
      if (status !== 'all') {
        pools = pools.filter(pool => pool.status === status);
      }

      // Format for API response
      const formattedPools = pools.map(pool => ({
        pairAddress: pool.pairAddress,
        chain: pool.chain,
        name: pool.name,
        status: pool.status || 'active',
        version: pool.version || 'v2.2',
        tokenX: {
          address: pool.tokenX?.address || '',
          name: pool.tokenX?.name || '',
          symbol: pool.tokenX?.symbol || '',
          decimals: pool.tokenX?.decimals || 18,
          logoURI: pool.tokenX?.logoURI || undefined
        },
        tokenY: {
          address: pool.tokenY?.address || '',
          name: pool.tokenY?.name || '',
          symbol: pool.tokenY?.symbol || '',
          decimals: pool.tokenY?.decimals || 18,
          logoURI: pool.tokenY?.logoURI || undefined
        },
        reserveX: pool.reserveX,
        reserveY: pool.reserveY,
        lbBinStep: pool.lbBinStep,
        activeBinId: pool.activeBinId,
        liquidityUsd: pool.liquidityUsd,
        volumeUsd: pool.volumeUsd,
        feesUsd: pool.feesUsd,
        apy: pool.apy
      }));

      return c.json({
        pools: formattedPools,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: Math.ceil(result.total / result.pageSize)
        }
      });
    } catch (error: any) {
      console.error('Pools error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 3. 🏊 Pool Details - Get specific pool information
  app.get('/v1/pools/:chain/:address', async (c) => {
    try {
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const address = addressSchema.parse(c.req.param('address'));

      const dbService = getDatabaseService(c);
      const pool = await dbService.getPoolDetails(chain, address);

      if (!pool) {
        return c.json({ error: 'Pool not found' }, 404);
      }

      const formattedPool = {
        pairAddress: pool.pairAddress,
        chain: pool.chain,
        name: pool.name,
        status: pool.status || 'active',
        version: pool.version || 'v2.2',
        tokenX: {
          address: pool.tokenX?.address || '',
          name: pool.tokenX?.name || '',
          symbol: pool.tokenX?.symbol || '',
          decimals: pool.tokenX?.decimals || 18,
          logoURI: pool.tokenX?.logoURI || undefined
        },
        tokenY: {
          address: pool.tokenY?.address || '',
          name: pool.tokenY?.name || '',
          symbol: pool.tokenY?.symbol || '',
          decimals: pool.tokenY?.decimals || 18,
          logoURI: pool.tokenY?.logoURI || undefined
        },
        reserveX: pool.reserveX,
        reserveY: pool.reserveY,
        lbBinStep: pool.lbBinStep,
        activeBinId: pool.activeBinId,
        liquidityUsd: pool.liquidityUsd,
        volumeUsd: pool.volumeUsd,
        feesUsd: pool.feesUsd,
        apy: pool.apy
      };

      return c.json(formattedPool);
    } catch (error: any) {
      console.error('Pool details error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 4. 👤 User Bin IDs - Get user's bin IDs for a pool
  app.get('/v1/user/bin-ids/:user_address/:chain/:pool_address', async (c) => {
    try {
      const userAddress = addressSchema.parse(c.req.param('user_address'));
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const poolAddress = addressSchema.parse(c.req.param('pool_address'));

      const dbService = getDatabaseService(c);
      const binIds = await dbService.getUserBinIds(userAddress, chain, poolAddress);

      return c.json(binIds);
    } catch (error: any) {
      console.error('User bin IDs error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 5. 👤 User Pool IDs - Get user's pool IDs
  app.get('/v1/user/pool-ids/:user_address/:chain', async (c) => {
    try {
      const userAddress = addressSchema.parse(c.req.param('user_address'));
      const chain = chainParamSchema.parse(c.req.param('chain'));

      const dbService = getDatabaseService(c);
      const poolIds = await dbService.getUserPoolIds(userAddress, chain);

      return c.json(poolIds);
    } catch (error: any) {
      console.error('User pool IDs error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 6. 👤 User Balances - Get user token balances
  app.get('/v1/user/balances/:user_address/:chain', async (c) => {
    try {
      const userAddress = addressSchema.parse(c.req.param('user_address'));
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const tokens = c.req.query('tokens')?.split(',');

      const dbService = getDatabaseService(c);
      const balances = await dbService.getUserBalances(userAddress, chain, tokens);

      return c.json(balances);
    } catch (error: any) {
      console.error('User balances error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 7. 👤 User Swap History - Get user's swap transactions
  app.get('/v1/user/swap-history/:user_address/:chain', async (c) => {
    try {
      const userAddress = addressSchema.parse(c.req.param('user_address'));
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const pagination = paginationSchema.parse({
        pageSize: c.req.query('pageSize'),
        page: c.req.query('page')
      });
      const startTime = timestampSchema.parse(c.req.query('startTime'));
      const endTime = timestampSchema.parse(c.req.query('endTime'));

      const dbService = getDatabaseService(c);
      const history = await dbService.getUserSwapHistory(userAddress, chain, {
        pageSize: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        startTime,
        endTime
      });

      return c.json(history);
    } catch (error: any) {
      console.error('User swap history error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 8. 👤 User Liquidity History - Get user's liquidity transactions
  app.get('/v1/user/liquidity-history/:user_address/:chain', async (c) => {
    try {
      const userAddress = addressSchema.parse(c.req.param('user_address'));
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const pagination = paginationSchema.parse({
        pageSize: c.req.query('pageSize'),
        page: c.req.query('page')
      });
      const startTime = timestampSchema.parse(c.req.query('startTime'));
      const endTime = timestampSchema.parse(c.req.query('endTime'));

      const dbService = getDatabaseService(c);
      const history = await dbService.getUserLiquidityHistory(userAddress, chain, {
        pageSize: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        startTime,
        endTime
      });

      return c.json(history);
    } catch (error: any) {
      console.error('User liquidity history error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 9. 👤 User Statistics - Get user's trading statistics
  app.get('/v1/user/statistics/:user_address/:chain', async (c) => {
    try {
      const userAddress = addressSchema.parse(c.req.param('user_address'));
      const chain = chainParamSchema.parse(c.req.param('chain'));

      const dbService = getDatabaseService(c);
      const stats = await dbService.getUserStatistics(userAddress, chain);

      return c.json(stats);
    } catch (error: any) {
      console.error('User statistics error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 10. 🔧 Admin - Manual sync for specific pool
  app.post('/v1/admin/sync/pool/:chain/:address', async (c) => {
    try {
      const chain = chainParamSchema.parse(c.req.param('chain'));
      const address = addressSchema.parse(c.req.param('address'));

      const syncService = getSyncService(c);
      await syncService.syncPool(chain, address);

      return c.json({ message: `Pool ${address} sync completed` });
    } catch (error: any) {
      console.error('Manual pool sync error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 11. 🔧 Admin - Add new pool
  app.post('/v1/admin/pools', async (c) => {
    try {
      const body = await c.req.json();
      const poolData = {
        address: addressSchema.parse(body.address),
        chain: chainParamSchema.parse(body.chain),
        tokenX: addressSchema.parse(body.tokenX),
        tokenY: addressSchema.parse(body.tokenY),
        binStep: z.number().parse(body.binStep),
        name: z.string().parse(body.name)
      };

      const syncService = getSyncService(c);
      await syncService.addPool(poolData);

      return c.json({ message: 'Pool added successfully' });
    } catch (error: any) {
      console.error('Add pool error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 12. 🔧 Admin - Add token info
  app.post('/v1/admin/tokens', async (c) => {
    try {
      const body = await c.req.json();
      const tokenData = {
        address: addressSchema.parse(body.address),
        chain: chainParamSchema.parse(body.chain),
        name: z.string().parse(body.name),
        symbol: z.string().parse(body.symbol),
        decimals: z.number().parse(body.decimals),
        logoURI: z.string().optional().parse(body.logoURI)
      };

      const syncService = getSyncService(c);
      await syncService.addToken(tokenData);

      return c.json({ message: 'Token added successfully' });
    } catch (error: any) {
      console.error('Add token error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 13. 📊 Sync Status - Get sync service status
  app.get('/v1/admin/sync/status', async (c) => {
    try {
      const syncService = getSyncService(c);
      const status = syncService.getSyncStatus();

      return c.json(status);
    } catch (error: any) {
      console.error('Sync status error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // 新增：用户管理端点

  // 注册用户
  app.post('/v1/auth/register', async (c) => {
    try {
      const body = await c.req.json();
      const userData = {
        email: z.string().email().parse(body.email),
        username: z.string().optional().parse(body.username),
        name: z.string().optional().parse(body.name),
        company: z.string().optional().parse(body.company),
        website: z.string().url().optional().parse(body.website),
        walletAddress: z.string().optional().parse(body.walletAddress),
      };

      const apiKeyService = getApiKeyService(c);
      const userId = await apiKeyService.createUser(userData);

      return c.json({
        message: 'User registered successfully',
        userId,
        nextStep: 'Please verify your email to activate your account'
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return c.json({ error: error.message }, 400);
    }
  });

  // 申请API密钥
  app.post('/v1/auth/apply-api-key', async (c) => {
    try {
      const body = await c.req.json();
      const applicationData = {
        userId: z.string().parse(body.userId),
        requestedTier: z.enum(['basic', 'pro', 'enterprise']).parse(body.requestedTier),
        reason: z.string().parse(body.reason),
        useCase: z.string().optional().parse(body.useCase),
        expectedVolume: z.string().optional().parse(body.expectedVolume),
      };

      const apiKeyService = getApiKeyService(c);
      const applicationId = await apiKeyService.applyForApiKey(
        applicationData.userId,
        applicationData
      );

      return c.json({
        message: 'API key application submitted successfully',
        applicationId,
        status: 'pending',
        note: 'Your application will be reviewed within 24-48 hours'
      });
    } catch (error: any) {
      console.error('API key application error:', error);
      return c.json({ error: error.message }, 400);
    }
  });

  // 获取用户API密钥列表
  app.get('/v1/auth/api-keys/:userId', async (c) => {
    try {
      const userId = z.string().parse(c.req.param('userId'));
      
      const apiKeyService = getApiKeyService(c);
      const apiKeys = await apiKeyService.getUserApiKeys(userId);

      return c.json({
        apiKeys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          tier: key.tier,
          status: key.status,
          permissions: key.permissions,
          rateLimits: {
            hourly: key.rateLimitPerHour,
            daily: key.rateLimitPerDay
          },
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt
        }))
      });
    } catch (error: any) {
      console.error('Get API keys error:', error);
      return c.json({ error: error.message }, 400);
    }
  });

  // 撤销API密钥
  app.delete('/v1/auth/api-keys/:keyId', async (c) => {
    try {
      const keyId = z.string().parse(c.req.param('keyId'));
      const { userId } = await c.req.json();

      const apiKeyService = getApiKeyService(c);
      await apiKeyService.revokeApiKey(keyId, userId);

      return c.json({ message: 'API key revoked successfully' });
    } catch (error: any) {
      console.error('Revoke API key error:', error);
      return c.json({ error: error.message }, 400);
    }
  });

  // API使用统计
  app.get('/v1/usage/stats/:userId', async (c) => {
    try {
      const userId = z.string().parse(c.req.param('userId'));
      const days = z.coerce.number().min(1).max(90).default(30).parse(c.req.query('days'));

      // TODO: 实现使用统计查询
      return c.json({
        period: `${days} days`,
        totalRequests: 0,
        successfulRequests: 0,
        errorRequests: 0,
        avgResponseTime: 0,
        dataTransfer: 0,
        dailyBreakdown: []
      });
    } catch (error: any) {
      console.error('Usage stats error:', error);
      return c.json({ error: error.message }, 400);
    }
  });

  // Updated health check with authentication info
  app.get('/health', async (c) => {
    return c.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: 'v2.0-database-auth',
      features: ['Database-powered', 'API Key Authentication', 'Rate Limiting', 'Permission System']
    });
  });

  // Updated documentation
  app.get('/', async (c) => {
    return c.json({
      name: 'Entysquare DEX API (Database-powered with Authentication)',
      version: '2.0',
      description: 'Fast DEX API powered by D1 database with comprehensive authentication system',
      authentication: {
        type: 'API Key',
        header: 'x-api-key',
        registration: 'POST /v1/auth/register',
        applyApiKey: 'POST /v1/auth/apply-api-key'
      },
      tiers: {
        free: { 
          price: '$0/month', 
          requests: '1,000/day', 
          features: ['Basic pool data', 'Public analytics'] 
        },
        basic: { 
          price: '$29/month', 
          requests: '10,000/day', 
          features: ['Advanced analytics', 'User data', 'Event data'] 
        },
        pro: { 
          price: '$99/month', 
          requests: '100,000/day', 
          features: ['Real-time data', 'Write operations', 'Priority support'] 
        },
        enterprise: { 
          price: '$299/month', 
          requests: '500,000/day', 
          features: ['Full access', 'Admin operations', 'Custom integrations'] 
        }
      },
      endpoints: {
        // Authentication
        register: 'POST /v1/auth/register',
        applyApiKey: 'POST /v1/auth/apply-api-key',
        getUserApiKeys: 'GET /v1/auth/api-keys/{userId}',
        revokeApiKey: 'DELETE /v1/auth/api-keys/{keyId}',
        usageStats: 'GET /v1/usage/stats/{userId}',
        
        // DEX Data
        analytics: 'GET /v1/dex/analytics/{chain}',
        pools: 'GET /v1/pools/{chain}',
        poolDetails: 'GET /v1/pools/{chain}/{address}',
        userBinIds: 'GET /v1/user/bin-ids/{user_address}/{chain}/{pool_address}',
        userPoolIds: 'GET /v1/user/pool-ids/{user_address}/{chain}',
        userBalances: 'GET /v1/user/balances/{user_address}/{chain}',
        userSwapHistory: 'GET /v1/user/swap-history/{user_address}/{chain}',
        userLiquidityHistory: 'GET /v1/user/liquidity-history/{user_address}/{chain}',
        userStatistics: 'GET /v1/user/statistics/{user_address}/{chain}',
        
        // Admin (Enterprise only)
        adminSyncPool: 'POST /v1/admin/sync/pool/{chain}/{address}',
        adminAddPool: 'POST /v1/admin/pools',
        adminAddToken: 'POST /v1/admin/tokens',
        syncStatus: 'GET /v1/admin/sync/status'
      },
      supportedChains: ['binance', 'bsctest'],
      documentation: 'https://docs.entysquare.com/dex-api',
      support: 'support@entysquare.com'
    });
  });

  return app;
}
