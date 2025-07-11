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
	
	// Get pools sorted by TVL and their 24h data
	const [poolsRaw, poolsDayData] = await Promise.all([
		subgraphClient.getPools(1000, 0, 'totalValueLockedUSD', 'desc'),
		subgraphClient.getPoolsDayData(1000, 1) // Get 24h data
	]);
	
	const pools = Array.isArray(poolsRaw) ? poolsRaw : [];
	
	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});
	
	// Filter pools that qualify as farms (decent TVL, active)
	const farmEligiblePools = pools.filter((pool: any) => {
		const tvl = parseFloat(pool?.totalValueLockedUSD || '0');
		const liquidityProviders = parseInt(pool?.liquidityProviderCount || '0');
		const dayData = poolDayDataMap.get(pool.id);
		const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
		
		return tvl >= minTvl && 
			   liquidityProviders > 0 && 
			   volume24h > 100; // Require some real 24h trading activity
	});

	// Transform pools to farm format with enhanced data
	const farms = farmEligiblePools.slice((page - 1) * limit, page * limit).map((pool: any) => {
		const dayData = poolDayDataMap.get(pool.id);
		return transformPoolToFarm(pool, dayData);
	});

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
	
	const [userPositionsRaw, poolsDayData] = await Promise.all([
		subgraphClient.getUserPositions(userAddress),
		subgraphClient.getPoolsDayData(1000, 1) // Get 24h data for reward calculations
	]);
	
	const userPositions = Array.isArray(userPositionsRaw) ? userPositionsRaw : [];
	
	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});
	
	// Filter positions that are in farm-eligible pools
	const farmPositions = userPositions.filter((position: any) => {
		const tvl = parseFloat(position?.pool?.totalValueLockedUSD || '0');
		const dayData = poolDayDataMap.get(position?.pool?.id);
		const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
		
		return tvl >= 5000 && volume24h > 100; // Real 24h volume requirement
	});

	// Transform to farm position format
	const userFarms = farmPositions.map((position: any) => {
		const dayData = poolDayDataMap.get(position?.pool?.id);
		
		return {
			farmId: `farm_${position?.pool?.id || 'unknown'}`,
			farmAddress: position?.pool?.id || '',
			name: `${position?.pool?.tokenX?.symbol || 'Unknown'}/${position?.pool?.tokenY?.symbol || 'Unknown'} Farm`,
			poolAddress: position?.pool?.id || '',
			strategy: 'liquidity_mining',
			tokenX: {
				address: position?.pool?.tokenX?.id || '',
				symbol: position?.pool?.tokenX?.symbol || '',
				name: position?.pool?.tokenX?.name || '',
				decimals: parseInt(position?.pool?.tokenX?.decimals || '18'),
			},
			tokenY: {
				address: position?.pool?.tokenY?.id || '',
				symbol: position?.pool?.tokenY?.symbol || '',
				name: position?.pool?.tokenY?.name || '',
				decimals: parseInt(position?.pool?.tokenY?.decimals || '18'),
			},
			userPosition: {
				shares: position?.liquidity || '0',
				valueUsd: position?.liquidityUSD || '0',
				depositedAt: position?.timestamp ? 
					parseInt(position.timestamp) * 1000 : Date.now(),
				lastHarvest: position?.timestamp ? 
					parseInt(position.timestamp) * 1000 : Date.now(),
			},
			rewards: calculateUserRewards(position, dayData),
			apy: calculateFarmAPY(position?.pool, dayData),
			tvl: parseFloat(position?.pool?.totalValueLockedUSD || '0'),
			volume24h: dayData ? parseFloat(dayData.volumeUSD || '0') : 0,
			fees24h: dayData ? parseFloat(dayData.feesUSD || '0') : 0,
			status: 'active',
		};
	});

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
	
	const [userPositions, pool, poolDayData] = await Promise.all([
		subgraphClient.getUserPositionsInPool(userAddress, poolId),
		subgraphClient.getPoolById(poolId),
		subgraphClient.getPoolDayData(poolId, 1) // Get 24h data for this specific pool
	]);
	
	if (!userPositions || userPositions.length === 0) {
		return c.json({
			error: 'User farm position not found',
			farmId,
			userAddress,
			timestamp: new Date().toISOString()
		}, 404);
	}

	if (!pool) {
		return c.json({
			error: 'Farm pool not found',
			farmId,
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Get the most recent day data for this pool
	const dayData = poolDayData && poolDayData.length > 0 ? poolDayData[0] : null;

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
			decimals: parseInt(pool.tokenX.decimals || '18'),
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: parseInt(pool.tokenY.decimals || '18'),
		},
		userPosition: {
			shares: totalLiquidity.toString(),
			valueUsd: totalLiquidityUSD.toString(),
			positionCount: userPositions.length,
			positions: userPositions.map((pos: any) => ({
				binId: pos.binId || 0,
				liquidity: pos.liquidity || '0',
				liquidityUSD: pos.liquidityUSD || '0',
				tokenXBalance: pos.tokenXBalance || '0',
				tokenYBalance: pos.tokenYBalance || '0',
			})),
			depositedAt: userPositions.length > 0 ? 
				Math.min(...userPositions.map((pos: any) => parseInt(pos.timestamp || '0'))) * 1000 : 
				Date.now(),
			lastHarvest: userPositions.length > 0 ? 
				Math.max(...userPositions.map((pos: any) => parseInt(pos.timestamp || '0'))) * 1000 : 
				Date.now(),
		},
		rewards: calculateUserRewards({ 
			pool, 
			liquidity: totalLiquidity.toString(), 
			liquidityUSD: totalLiquidityUSD.toString() 
		}, dayData),
		farmInfo: {
			apy: calculateFarmAPY(pool, dayData),
			tvl: parseFloat(pool.totalValueLockedUSD || '0'),
			volume24h: dayData ? parseFloat(dayData.volumeUSD || '0') : 0,
			fees24h: dayData ? parseFloat(dayData.feesUSD || '0') : 0,
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
function transformPoolToFarm(pool: any, dayData?: any) {
	const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
	const fees24h = dayData ? parseFloat(dayData.feesUSD || '0') : 0;
	const riskLevel = getFarmRiskLevel(pool, dayData);
	
	return {
		farmId: `farm_${pool.id}`,
		farmAddress: pool.id,
		name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Farm`,
		description: `Earn rewards by providing liquidity to ${pool.tokenX.symbol}/${pool.tokenY.symbol} pair`,
		poolAddress: pool.id,
		strategy: 'liquidity_mining',
		category: getFarmCategory(pool),
		riskLevel: riskLevel,
		rewardTokens: [
			{
				symbol: pool.tokenX.symbol,
				address: pool.tokenX.id,
				rewardRate: calculateRewardRate(pool, 'tokenX'),
			},
			{
				symbol: pool.tokenY.symbol,
				address: pool.tokenY.id,
				rewardRate: calculateRewardRate(pool, 'tokenY'),
			}
		],
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: parseInt(pool.tokenX.decimals || '18'),
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: parseInt(pool.tokenY.decimals || '18'),
		},
		metrics: {
			apy: calculateFarmAPY(pool, dayData),
			apr: calculateFarmAPR(pool, dayData),
			tvl: parseFloat(pool.totalValueLockedUSD || '0'),
			volume24h: volume24h,
			fees24h: fees24h,
			totalUsers: parseInt(pool.liquidityProviderCount || '0'),
		},
		status: parseInt(pool.liquidityProviderCount || '0') > 0 ? 'active' : 'inactive',
		createdAt: pool.timestamp ? 
			new Date(parseInt(pool.timestamp) * 1000).toISOString() : new Date().toISOString(),
	};
}

function getFarmCategory(pool: any): string {
	const tokenXSymbol = pool.tokenX?.symbol || '';
	const tokenYSymbol = pool.tokenY?.symbol || '';
	
	const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI'];
	const majorTokens = ['BNB', 'ETH', 'BTC'];
	
	const isStablePair = stablecoins.includes(tokenXSymbol) && stablecoins.includes(tokenYSymbol);
	const isMajorPair = majorTokens.includes(tokenXSymbol) || majorTokens.includes(tokenYSymbol);
	
	if (isStablePair) return 'Stable';
	if (isMajorPair) return 'Blue Chip';
	return 'Emerging';
}

function calculateFarmAPY(pool: any, dayData?: any): number {
	// Calculate base APY from fees using real 24h data if available
	const baseAPY = calculatePoolAPY(pool, dayData);
	
	// Add estimated reward APY based on pool metrics
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
	
	// Higher rewards for higher volume pools (incentivize trading)
	const volumeMultiplier = Math.min(volume24h / tvl, 1.0); // Cap at 100% volume/TVL ratio
	const rewardAPY = 5 + (volumeMultiplier * 15); // 5-20% additional rewards
	
	return baseAPY + rewardAPY;
}

function calculateFarmAPR(pool: any, dayData?: any): number {
	// Convert APY to APR
	const apy = calculateFarmAPY(pool, dayData);
	// APR = APY / (1 + APY/100) * 100 (rough conversion)
	return apy * 0.95; // Slightly lower than APY for conservative estimate
}

function calculatePoolAPY(pool: any, dayData?: any): number {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	
	if (tvl === 0) return 0;
	
	let dailyFees = 0;
	
	if (dayData && dayData.feesUSD) {
		// Use real 24h fees if available
		dailyFees = parseFloat(dayData.feesUSD);
	} else {
		// Fallback: estimate from lifetime fees
		const feesLifetime = parseFloat(pool.feesUSD || '0');
		dailyFees = feesLifetime / 30; // Rough estimate over 30 days
	}
	
	const dailyAPR = (dailyFees / tvl) * 100;
	const apr = dailyAPR * 365;
	
	// Convert APR to APY (compound daily)
	return ((1 + apr / 100 / 365) ** 365 - 1) * 100;
}

function calculateRewardRate(pool: any, token: 'tokenX' | 'tokenY'): string {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const tokenSymbol = pool[token]?.symbol || '';
	
	// Base reward rate inversely proportional to TVL (higher rewards for smaller pools)
	let baseRate = Math.max(0.01, Math.min(1.0, 10000 / tvl)); // 0.01-1.0 range
	
	// Adjust based on token type (hypothetical preference for certain tokens)
	if (['USDT', 'USDC', 'BUSD'].includes(tokenSymbol)) {
		baseRate *= 0.8; // Lower rewards for stablecoins
	} else if (['BNB', 'ETH', 'BTC'].includes(tokenSymbol)) {
		baseRate *= 1.2; // Higher rewards for major tokens
	}
	
	return baseRate.toFixed(4);
}

function calculateUserRewards(position: any, dayData?: any) {
	const liquidityUSD = parseFloat(position.liquidityUSD || '0');
	const poolTvl = parseFloat(position.pool?.totalValueLockedUSD || '1');
	
	if (poolTvl === 0 || liquidityUSD === 0) {
		return {
			pending: '0',
			pendingUsd: '0.00',
			totalEarned: '0',
			totalEarnedUsd: '0.00',
		};
	}
	
	// Calculate user's share of pool
	const userShare = liquidityUSD / poolTvl;
	
	// Calculate daily rewards based on real 24h fees if available
	let dailyPoolFees = 0;
	if (dayData && dayData.feesUSD) {
		dailyPoolFees = parseFloat(dayData.feesUSD);
	} else {
		// Fallback: estimate from lifetime fees
		const poolFeesLifetime = parseFloat(position.pool?.feesUSD || '0');
		dailyPoolFees = poolFeesLifetime / 30; // Rough estimate over 30 days
	}
	
	// User gets their proportional share of fees plus farm rewards
	const dailyFeeShare = dailyPoolFees * userShare;
	const farmRewardMultiplier = 1.5; // 50% additional farm rewards
	const dailyRewards = dailyFeeShare * farmRewardMultiplier;
	
	// Calculate pending (7 days) and total earned (30 days)
	const pendingRewards = dailyRewards * 7;
	const totalEarned = dailyRewards * 30;
	
	// Mock USD conversion (in real implementation, get token prices)
	const avgTokenPriceUSD = 1.5;
	
	return {
		pending: pendingRewards.toFixed(6),
		pendingUsd: (pendingRewards * avgTokenPriceUSD).toFixed(2),
		totalEarned: totalEarned.toFixed(6),
		totalEarnedUsd: (totalEarned * avgTokenPriceUSD).toFixed(2),
	};
}

function getFarmRiskLevel(pool: any, dayData?: any): 'low' | 'medium' | 'high' {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
	
	if (tvl === 0) return 'high';
	
	const volumeToTvlRatio = volume24h / tvl;
	const liquidityProviders = parseInt(pool.liquidityProviderCount || '0');
	
	// Risk assessment based on multiple factors
	if (tvl > 100000 && liquidityProviders > 50 && volumeToTvlRatio < 0.2) {
		return 'low';
	} else if (tvl > 25000 && liquidityProviders > 10 && volumeToTvlRatio < 0.5) {
		return 'medium';
	} else {
		return 'high';
	}
}

function isValidAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}
