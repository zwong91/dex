import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAuthMiddleware } from './middleware/auth';
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

	// Health check endpoint (no auth required)
	app.get('/health', async (c) => {
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
	});

	// Subgraph metadata endpoint (no auth required)
	app.get('/subgraph/meta', async (c) => {
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
	});

	// Apply authentication middleware to protected routes
	app.use('*', createAuthMiddleware());

	// === CORE DATA ENDPOINTS (GraphQL-only) ===
	
	// Pools endpoints
	app.get('/pools', createPoolsHandler('list'));
	app.get('/pools/:poolId', createPoolsHandler('details'));
	app.get('/tokens', createPoolsHandler('tokens'));
	app.get('/analytics', createPoolsHandler('analytics'));

	// DEX extra endpoints
	app.get('/swaps', createSwapsHandler('list'));
	app.get('/liquidity', createLiquidityHandler('list'));
	app.get('/fees', createFeesHandler('list'));
	app.get('/price', createPriceHandler('list'));

	// === USER DATA ENDPOINTS (GraphQL-only) ===
	
	app.get('/user/:address/bin-ids', createUsersHandler('binIds'));
	app.get('/user/:address/pool-ids', createUsersHandler('poolIds'));
	app.get('/user/:address/history', createUsersHandler('history'));
	app.get('/user/:address/lifetime-stats', createUsersHandler('lifetimeStats'));
	app.get('/user/:address/fees-earned', createUsersHandler('feesEarned'));
	app.get('/pool/:poolId/user/:address/balances', createUsersHandler('poolBalances'));

	// === VAULTS ENDPOINTS (GraphQL-only) ===
	
	app.get('/vaults', createVaultsHandler('list'));
	app.get('/vaults/:vaultId', createVaultsHandler('details'));
	app.get('/vaults/analytics', createVaultsHandler('analytics'));
	app.get('/vaults/strategies', createVaultsHandler('strategies'));

	// === FARMS ENDPOINTS (GraphQL-only) ===
	
	app.get('/farms', createFarmsHandler('list'));
	app.get('/user/:address/farms', createFarmsHandler('userFarms'));
	app.get('/user/:address/farms/:farmId', createFarmsHandler('userFarmDetails'));

	// === REWARDS ENDPOINTS (GraphQL-only) ===
	
	app.get('/user/:address/rewards', createRewardsHandler('userRewards'));
	app.get('/user/:address/claimable-rewards', createRewardsHandler('claimableRewards'));
	app.get('/user/:address/rewards/history', createRewardsHandler('rewardsHistory'));
	
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
