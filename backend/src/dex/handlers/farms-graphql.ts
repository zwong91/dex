/**
 * DEX Farms Handlers - Pure GraphQL Implementation with Hono
 * Farms are pools with additional reward mechanisms
 */

import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

/**
 * Create farms handler factory
 */
export function createFarmsHandler(action: string) {
	return async function farmsHandler(c: Context<{ Bindings: Env }>) {
		try {
			const subgraphClient = createSubgraphClient(c.env);
			
			// Check if subgraph is available and healthy
			const subgraphHealth = await subgraphClient.checkHealth();
			
			if (!subgraphHealth.healthy) {
				return c.json({
					success: false,
					error: 'Subgraph unavailable',
					message: 'SUBGRAPH_ERROR',
					timestamp: new Date().toISOString()
				}, 503);
			}

			switch (action) {
				case 'list':
					return await handleFarmsList(c, subgraphClient);
				case 'userFarms':
					return await handleUserFarms(c, subgraphClient);
				case 'userFarmDetails':
					return await handleUserFarmDetails(c, subgraphClient);
				default:
					return c.json({
						error: 'Invalid action',
						timestamp: new Date().toISOString()
					}, 400);
			}

		} catch (error) {
			console.error('Farms handler error:', error);
			return c.json({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	};
}

/**
 * Get list of all farms (pools with reward mechanisms)
 */
async function handleFarmsList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const page = parseInt(c.req.query('page') || '1');
	const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
	const minTvl = parseFloat(c.req.query('minTvl') || '5000'); // Minimum TVL for farm eligibility
	
	console.log('🔗 Fetching farm-eligible pools from subgraph...');
	
	// Get all pools - since we don't have TVL data, use timestamp ordering for most recent
	const pools = await subgraphClient.getPools(1000, 0, 'timestamp', 'desc');
	
	// Since we don't have TVL/volume data in current schema, treat all pools as potential farms
	// In a real implementation, you would calculate activity from bins and traces
	const farmEligiblePools = pools.filter((pool: any) => 
		pool.name && pool.tokenX && pool.tokenY // Basic validation
	);

	// Transform pools to farm format
	const farms = farmEligiblePools.slice((page - 1) * limit, page * limit).map((pool: any) => 
		transformPoolToFarm(pool)
	);

	const pagination = {
		page,
		limit,
		total: farmEligiblePools.length,
		totalPages: Math.ceil(farmEligiblePools.length / limit),
		hasNext: page * limit < farmEligiblePools.length,
		hasPrev: page > 1,
	};

	return c.json({
		success: true,
		data: farms,
		pagination,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user's farm positions
 */
async function handleUserFarms(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user farm positions from subgraph...', userAddress);
	
	const userPositions = await subgraphClient.getUserPositions(userAddress);
	
	// Filter positions that are in farm-eligible pools
	const farmPositions = userPositions.filter((position: any) => 
		parseFloat(position.pool.totalValueLockedUSD || '0') >= 5000 &&
		parseFloat(position.pool.volumeUSD24h || '0') > 1000
	);

	// Transform to farm position format
	const userFarms = farmPositions.map((position: any) => ({
		farmId: `farm_${position.pool.id}`,
		farmAddress: position.pool.id,
		name: `${position.pool.tokenX.symbol}/${position.pool.tokenY.symbol} Farm`,
		poolAddress: position.pool.id,
		strategy: 'liquidity_mining',
		tokenX: {
			address: position.pool.tokenX.id,
			symbol: position.pool.tokenX.symbol,
			name: position.pool.tokenX.name,
			decimals: position.pool.tokenX.decimals,
		},
		tokenY: {
			address: position.pool.tokenY.id,
			symbol: position.pool.tokenY.symbol,
			name: position.pool.tokenY.name,
			decimals: position.pool.tokenY.decimals,
		},
		userPosition: {
			shares: position.liquidity || '0',
			valueUsd: position.liquidityUSD || '0',
			depositedAt: position.createdAtTimestamp ? 
				parseInt(position.createdAtTimestamp) * 1000 : Date.now(),
			lastHarvest: position.updatedAtTimestamp ? 
				parseInt(position.updatedAtTimestamp) * 1000 : Date.now(),
		},
		rewards: calculateUserRewards(position),
		apy: calculateFarmAPY(position.pool),
		tvl: position.pool.totalValueLockedUSD || '0',
		status: 'active',
	}));

	return c.json({
		success: true,
		data: {
			userAddress,
			farms: userFarms,
			totalFarms: userFarms.length,
			totalValueUsd: userFarms.reduce((sum: number, farm: any) => 
				sum + parseFloat(farm.userPosition.valueUsd), 0).toString(),
		},
		timestamp: new Date().toISOString()
	});
}

/**
 * Get specific user farm details
 */
async function handleUserFarmDetails(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	const farmId = c.req.param('farmId');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	if (!farmId) {
		return c.json({
			error: 'Farm ID is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	// Extract pool ID from farm ID (format: farm_<poolId>)
	const poolId = farmId.replace('farm_', '');
	
	console.log('🔗 Fetching user farm details from subgraph...', userAddress, poolId);
	
	const userPositions = await subgraphClient.getUserPositionsInPool(userAddress, poolId);
	
	if (!userPositions || userPositions.length === 0) {
		return c.json({
			error: 'User farm position not found',
			farmId,
			userAddress,
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Get pool details
	const pool = await subgraphClient.getPoolById(poolId);
	
	if (!pool) {
		return c.json({
			error: 'Farm pool not found',
			farmId,
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Aggregate user positions in this farm
	const totalLiquidity = userPositions.reduce((sum: number, pos: any) => 
		sum + parseFloat(pos.liquidity || '0'), 0);
	
	const totalLiquidityUSD = userPositions.reduce((sum: number, pos: any) => 
		sum + parseFloat(pos.liquidityUSD || '0'), 0);

	const farmDetails = {
		farmId,
		farmAddress: poolId,
		name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Farm`,
		description: `Liquidity mining farm for ${pool.tokenX.symbol}/${pool.tokenY.symbol} pair`,
		poolAddress: poolId,
		strategy: 'liquidity_mining',
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: pool.tokenX.decimals,
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: pool.tokenY.decimals,
		},
		userPosition: {
			shares: totalLiquidity.toString(),
			valueUsd: totalLiquidityUSD.toString(),
			positionCount: userPositions.length,
			positions: userPositions.map((pos: any) => ({
				binId: pos.binId,
				liquidity: pos.liquidity,
				liquidityUSD: pos.liquidityUSD,
				tokenXBalance: pos.tokenXBalance || '0',
				tokenYBalance: pos.tokenYBalance || '0',
			})),
			depositedAt: userPositions.length > 0 ? 
				Math.min(...userPositions.map((pos: any) => parseInt(pos.createdAtTimestamp || '0'))) * 1000 : 
				Date.now(),
			lastHarvest: userPositions.length > 0 ? 
				Math.max(...userPositions.map((pos: any) => parseInt(pos.updatedAtTimestamp || '0'))) * 1000 : 
				Date.now(),
		},
		rewards: calculateUserRewards({ pool, liquidity: totalLiquidity.toString(), liquidityUSD: totalLiquidityUSD.toString() }),
		farmInfo: {
			apy: calculateFarmAPY(pool),
			tvl: pool.totalValueLockedUSD || '0',
			volume24h: pool.volumeUSD24h || '0',
			fees24h: pool.feesUSD24h || '0',
			totalUsers: parseInt(pool.liquidityProviderCount || '0'),
		},
		status: 'active',
	};

	return c.json({
		success: true,
		data: farmDetails,
		timestamp: new Date().toISOString()
	});
}

// Helper functions
function transformPoolToFarm(pool: any) {
	return {
		farmId: `farm_${pool.id}`,
		farmAddress: pool.id,
		name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Farm`,
		description: `Earn rewards by providing liquidity to ${pool.tokenX.symbol}/${pool.tokenY.symbol} pair`,
		poolAddress: pool.id,
		strategy: 'liquidity_mining',
		rewardTokens: [
			{
				symbol: pool.tokenX.symbol,
				address: pool.tokenX.id,
				rewardRate: '0.1', // Mock reward rate
			},
			{
				symbol: pool.tokenY.symbol,
				address: pool.tokenY.id,
				rewardRate: '0.1', // Mock reward rate
			}
		],
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: pool.tokenX.decimals,
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: pool.tokenY.decimals,
		},
		apy: calculateFarmAPY(pool),
		apr: calculateFarmAPR(pool),
		tvl: pool.totalValueLockedUSD || '0',
		volume24h: pool.volumeUSD24h || '0',
		totalUsers: parseInt(pool.liquidityProviderCount || '0'),
		status: 'active',
		createdAt: pool.createdAtTimestamp ? 
			new Date(parseInt(pool.createdAtTimestamp) * 1000).toISOString() : new Date().toISOString(),
	};
}

function calculateFarmAPY(pool: any): number {
	// Calculate base APY from fees
	const baseAPY = calculatePoolAPY(pool);
	
	// Add estimated reward APY (mock calculation)
	const rewardAPY = Math.random() * 20; // 0-20% additional rewards
	
	return baseAPY + rewardAPY;
}

function calculateFarmAPR(pool: any): number {
	// Convert APY to APR
	const apy = calculateFarmAPY(pool);
	return apy * 0.95; // Slightly lower than APY
}

function calculatePoolAPY(pool: any): number {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const fees24h = parseFloat(pool.feesUSD24h || '0');
	
	if (tvl === 0) return 0;
	
	const dailyAPR = (fees24h / tvl) * 100;
	const apr = dailyAPR * 365;
	
	// Convert APR to APY (compound daily)
	return ((1 + apr / 100 / 365) ** 365 - 1) * 100;
}

function calculateUserRewards(position: any) {
	const liquidityUSD = parseFloat(position.liquidityUSD || '0');
	const poolTvl = parseFloat(position.pool?.totalValueLockedUSD || '1');
	
	// Simple reward calculation based on user's share of pool
	const userShare = liquidityUSD / poolTvl;
	const dailyRewards = userShare * 100; // Mock daily rewards
	const totalEarned = dailyRewards * 30; // Mock 30 days of rewards
	
	return {
		pending: (dailyRewards * 7).toFixed(6), // 7 days pending
		pendingUsd: (dailyRewards * 7 * 1.5).toFixed(2), // Mock USD value
		totalEarned: totalEarned.toFixed(6),
		totalEarnedUsd: (totalEarned * 1.5).toFixed(2), // Mock USD value
	};
}

function isValidAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}
