import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAuthMiddleware } from './middleware/auth';
import { createPoolsHandler } from './handlers/pools-graphql';
import { createUsersHandler } from './handlers/users-graphql';  
import { createVaultsHandler } from './handlers/vaults-graphql';
import { createFarmsHandler } from './handlers/farms-graphql';
import { createRewardsHandler } from './handlers/rewards-graphql';
import { createSubgraphClient } from './graphql/client';
import type { Env } from '../index';

// Create DEX routes
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
				database: 'disconnected',
				subgraph: {
					url: c.env.SUBGRAPH_URL || 'mock',
					healthy: subgraphHealth.healthy,
					blockNumber: subgraphHealth.blockNumber,
					indexingErrors: subgraphHealth.hasIndexingErrors
				},
				services: {
					database: 'offline',
					blockchain_rpc: 'missing',
					price_api: 'missing'
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

	// Core data endpoints
	app.get('/pools', createPoolsHandler('list'));
	app.get('/pools/:poolId', createPoolsHandler('details'));
	app.get('/tokens', createPoolsHandler('tokens'));
	app.get('/analytics', createPoolsHandler('analytics'));

	// User endpoints
	app.get('/user/:address/bin-ids', createUsersHandler('binIds'));
	app.get('/user/:address/pool-ids', createUsersHandler('poolIds'));
	app.get('/user/:address/history', createUsersHandler('history'));
	app.get('/user/:address/lifetime-stats', createUsersHandler('lifetimeStats'));
	app.get('/user/:address/fees-earned', createUsersHandler('feesEarned'));
	app.get('/pool/:poolId/user/:address/balances', createUsersHandler('poolBalances'));

	// Vaults endpoints (derived from pools)
	app.get('/vaults', createVaultsHandler('list'));
	app.get('/vaults/analytics', createVaultsHandler('analytics'));
	app.get('/vaults/strategies', createVaultsHandler('strategies'));
	app.get('/vaults/:vaultId', createVaultsHandler('details'));

	// Farms endpoints (derived from pools)
	app.get('/farms', createFarmsHandler('list'));
	app.get('/user/:address/farms', createFarmsHandler('userFarms'));
	app.get('/user/:address/farms/:farmId', createFarmsHandler('userFarmDetails'));

	// Rewards endpoints (calculated from positions)
	app.get('/user/:address/rewards', createRewardsHandler('userRewards'));
	app.get('/user/:address/claimable-rewards', createRewardsHandler('claimableRewards'));
	app.get('/user/:address/rewards/history', createRewardsHandler('rewardsHistory'));
	
	// Batch proof endpoint with validation
	const batchProofSchema = z.object({
		userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
		poolIds: z.array(z.string()).min(1, 'At least one pool ID required'),
	});
	
	app.post('/rewards/batch-proof', 
		zValidator('json', batchProofSchema),
		createRewardsHandler('batchProof')
	);

	return app;
}
