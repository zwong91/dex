import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAuthMiddleware } from '../middleware/auth';
import { createKVCacheMiddleware } from '../middleware/cache';
import { createSubgraphClient } from './graphql/client';
import type { Env } from '../index';

// Import handler factory functions
import { createPoolsHandler } from './handlers/pools-graphql';
import { createUsersHandler } from './handlers/users-graphql';
import { createVaultsHandler } from './handlers/vaults-graphql';
import { createFarmsHandler } from './handlers/farms-graphql';
import { createRewardsHandler } from './handlers/rewards-graphql';
import { createSwapsHandler } from './handlers/swaps-graphql';
import { createLiquidityHandler } from './handlers/liquidity-graphql';
import { createFeesHandler } from './handlers/fees-graphql';
import { createPriceHandler } from './handlers/price-graphql';

/**
 * Unified DEX Routes using Hono framework
 * All routes use GraphQL as the single source of truth
 */
export function createDexRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	// Health check endpoint (no auth required, cached for fast responses)
	app.get('/health', 
		createKVCacheMiddleware('HEALTH'),
		async (c) => {
			try {
				const subgraphClient = createSubgraphClient(c.env);
				const subgraphHealth = await subgraphClient.checkHealth();
				
				return c.json({
					status: 'healthy',
					timestamp: new Date().toISOString(),
					version: '2.0.0',
					architecture: 'unified-graphql',
					subgraph: {
						url: c.env.SUBGRAPH_URL || 'mock',
						healthy: subgraphHealth.healthy,
						blockNumber: subgraphHealth.blockNumber,
						indexingErrors: subgraphHealth.hasIndexingErrors
					}
				});
			} catch (error) {
				console.error('Health check error:', error);
				return c.json({
					status: 'degraded',
					timestamp: new Date().toISOString(),
					error: 'Subgraph connection failed'
				}, 503);
			}
		}
	);

	// Subgraph metadata endpoint (no auth required, cached for performance)
	app.get('/subgraph/meta',
		createKVCacheMiddleware('METADATA'),
		async (c) => {
			try {
				const subgraphClient = createSubgraphClient(c.env);
				const meta = await subgraphClient.getMeta();
				
				return c.json({
					success: true,
					data: meta,
					timestamp: new Date().toISOString()
				});
			} catch (error) {
				console.error('Subgraph metadata error:', error);
				return c.json({
					success: false,
					error: 'Failed to fetch subgraph metadata',
					timestamp: new Date().toISOString()
				}, 503);
			}
		}
	);

	// Apply authentication middleware to protected routes
	app.use('*', createAuthMiddleware());

	// === CORE DATA ENDPOINTS (GraphQL-only with caching) ===
	
	// Pools endpoints - cache pool data for 5 minutes
	app.get('/pools/:chain', 
		createKVCacheMiddleware('POOLS'),
		createPoolsHandler('list')
	);
	app.get('/pools/:chain/search', 
		createKVCacheMiddleware('POOLS'),
		createPoolsHandler('searchByTokens')
	);
	app.get('/pools/:chain/:poolId', 
		createKVCacheMiddleware('POOLS'),
		createPoolsHandler('details')
	);
	app.get('/pools/:chain/:poolId/bins', 
		createKVCacheMiddleware('POOLS'),
		createPoolsHandler('bins')
	);
	app.get('/tokens/:chain', 
		createKVCacheMiddleware('STATIC'),
		createPoolsHandler('tokens')
	);
	app.get('/analytics/:chain', 
		createKVCacheMiddleware('ANALYTICS'),
		createPoolsHandler('analytics')
	);

	// DEX extra endpoints - price data changes frequently
	app.get('/swaps', 
		createKVCacheMiddleware('POOLS'),
		createSwapsHandler('list')
	);
	app.get('/liquidity', 
		createKVCacheMiddleware('POOLS'),
		createLiquidityHandler('list')
	);
	app.get('/fees', 
		createKVCacheMiddleware('ANALYTICS'),
		createFeesHandler('list')
	);
	app.get('/price', 
		createKVCacheMiddleware('PRICE'),
		createPriceHandler('list')
	);

	// === USER DATA ENDPOINTS (GraphQL-only with user-specific caching) ===
	
	app.get('/user/bin-ids/:user_address/:chain/:pool_address', 
		createKVCacheMiddleware('USER'),
		createUsersHandler('binIds')
	);
	app.get('/user/pool-ids/:user_address/:chain', 
		createKVCacheMiddleware('USER'),
		createUsersHandler('poolIds')
	);
	app.get('/user/pool-user-balances', 
		createKVCacheMiddleware('USER'),
		createUsersHandler('poolUserBalances')
	); // 如有参数请用 query
	app.get('/user/fees-earned/:chain/:user_address/:pool_address', 
		createKVCacheMiddleware('USER'),
		createUsersHandler('feesEarned')
	);
	app.get('/user/:chain/history/:user_address/:pool_address', 
		createKVCacheMiddleware('USER'),
		createUsersHandler('history')
	);
	app.get('/user-lifetime-stats/:chain/users/:user_address/swap-stats', 
		createKVCacheMiddleware('USER'),
		createUsersHandler('lifetimeStats')
	);

	// === VAULTS ENDPOINTS (GraphQL-only with appropriate caching) ===
	
	app.get('/vaults', 
		createKVCacheMiddleware('POOLS'),
		createVaultsHandler('list')
	);
	app.get('/vaults/:vaultId', 
		createKVCacheMiddleware('POOLS'),
		createVaultsHandler('details')
	);
	app.get('/vaults/analytics', 
		createKVCacheMiddleware('ANALYTICS'),
		createVaultsHandler('analytics')
	);
	app.get('/vaults/strategies', 
		createKVCacheMiddleware('STATIC'),
		createVaultsHandler('strategies')
	);

	// === FARMS ENDPOINTS (GraphQL-only with appropriate caching) ===
	
	app.get('/farms', 
		createKVCacheMiddleware('POOLS'),
		createFarmsHandler('list')
	);
	app.get('/user/:address/farms', 
		createKVCacheMiddleware('USER'),
		createFarmsHandler('userFarms')
	);
	app.get('/user/:address/farms/:farmId', 
		createKVCacheMiddleware('USER'),
		createFarmsHandler('userFarmDetails')
	);

	// === REWARDS ENDPOINTS (GraphQL-only with user-specific caching) ===
	
	app.get('/user/:address/rewards', 
		createKVCacheMiddleware('USER'),
		createRewardsHandler('userRewards')
	);
	app.get('/user/:address/claimable-rewards', 
		createKVCacheMiddleware('USER'),
		createRewardsHandler('claimableRewards')
	);
	app.get('/user/:address/rewards/history', 
		createKVCacheMiddleware('USER'),
		createRewardsHandler('rewardsHistory')
	);
	
	// Batch proof endpoint with validation
	const batchProofSchema = z.object({
		userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
		merkleProofs: z.array(z.any()).optional(),
		claims: z.array(z.any()).optional(),
	});
	
	app.post('/rewards/batch-proof', 
		zValidator('json', batchProofSchema),
		createRewardsHandler('batchProof')
	);

	return app;
}

/**
 * Route configuration for documentation and tooling
 */
export const UNIFIED_ROUTE_CONFIG = {
	// Health endpoints (no auth)
	health: [
		{ path: '/health', method: 'GET', auth: false, description: 'API health check' },
		{ path: '/subgraph/meta', method: 'GET', auth: false, description: 'Subgraph metadata' }
	],
	
	// Core data endpoints (auth required)
	pools: [
		{ path: '/pools', method: 'GET', auth: true, description: 'List all pools' },
		{ path: '/pools/:poolId', method: 'GET', auth: true, description: 'Get pool details' },
		{ path: '/tokens', method: 'GET', auth: true, description: 'List all tokens' },
		{ path: '/analytics', method: 'GET', auth: true, description: 'DEX analytics data' }
	],
	
	// User data endpoints (auth required)
	users: [
		{ path: '/user/:address/bin-ids', method: 'GET', auth: true, description: 'User bin IDs' },
		{ path: '/user/:address/pool-ids', method: 'GET', auth: true, description: 'User pool IDs' },
		{ path: '/user/:address/history', method: 'GET', auth: true, description: 'User transaction history' },
		{ path: '/user/:address/lifetime-stats', method: 'GET', auth: true, description: 'User lifetime statistics' },
		{ path: '/user/:address/fees-earned', method: 'GET', auth: true, description: 'User earned fees' },
		{ path: '/pool/:poolId/user/:address/balances', method: 'GET', auth: true, description: 'User pool balances' }
	],
	
	// Vaults endpoints (auth required)
	vaults: [
		{ path: '/vaults', method: 'GET', auth: true, description: 'List all vaults' },
		{ path: '/vaults/:vaultId', method: 'GET', auth: true, description: 'Get vault details' },
		{ path: '/vaults/analytics', method: 'GET', auth: true, description: 'Vault analytics' },
		{ path: '/vaults/strategies', method: 'GET', auth: true, description: 'Vault strategies' }
	],
	
	// Farms endpoints (auth required)
	farms: [
		{ path: '/farms', method: 'GET', auth: true, description: 'List all farms' },
		{ path: '/user/:address/farms', method: 'GET', auth: true, description: 'User farms' },
		{ path: '/user/:address/farms/:farmId', method: 'GET', auth: true, description: 'User farm details' }
	],
	
	// Rewards endpoints (auth required)
	rewards: [
		{ path: '/user/:address/rewards', method: 'GET', auth: true, description: 'User rewards' },
		{ path: '/user/:address/claimable-rewards', method: 'GET', auth: true, description: 'Claimable rewards' },
		{ path: '/user/:address/rewards/history', method: 'GET', auth: true, description: 'Rewards history' },
		{ path: '/rewards/batch-proof', method: 'POST', auth: true, description: 'Generate batch proof' }
	]
};
