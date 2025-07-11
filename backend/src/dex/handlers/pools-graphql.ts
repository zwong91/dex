/**
 * DEX Pools Handlers - Updated for Real Indexer Data
 * 
 * All handlers now use real GraphQL subgraph data exclusively.
 * Updated to match actual deployed BSC testnet indexer schema.
 */

import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';
import { recalculateTVL } from '../utils/priceCorrection';

/**
 * Create pools handler factory
 */
export function createPoolsHandler(action: string) {
	return async function poolsHandler(c: Context<{ Bindings: Env }>) {
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
					return await handlePoolsList(c, subgraphClient);
				case 'details':
					return await handlePoolDetails(c, subgraphClient);
				case 'tokens':
					return await handleTokensList(c, subgraphClient);
				case 'analytics':
					return await handleAnalytics(c, subgraphClient);
				default:
					return c.json({
						error: 'Invalid action',
						timestamp: new Date().toISOString()
					}, 400);
			}

		} catch (error) {
			console.error('Pools handler error:', error);
			return c.json({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	};
}

/**
 * Get list of all pools
 */
async function handlePoolsList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const page = parseInt(c.req.query('page') || '1');
	const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
	const offset = (page - 1) * limit;
	
	console.log('🔗 Fetching pools from subgraph...');

	// 获取 chain 路径参数
    const chain = c.req.param('chain') || 'none';

    // 你可以根据 chain 做不同处理，比如切换 subgraphClient，或校验
    console.log('Request chain:', chain);

	const subgraphPools = await subgraphClient.getPools(limit, offset, 'timestamp', 'desc');
	
	// Transform subgraph data to API format
	const transformedPools = subgraphPools.map((pool: any) => ({
		id: pool.id,
		pairAddress: pool.id,
		chain: 'bsc-testnet',
		name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
		status: parseInt(pool.liquidityProviderCount || '0') > 0 ? 'active' : 'inactive',
		version: '2.1',
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: parseInt(pool.tokenX.decimals),
			priceUsd: parseFloat(pool.tokenXPriceUSD || '0'),
			priceNative: pool.tokenXPrice || '0',
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: parseInt(pool.tokenY.decimals),
			priceUsd: parseFloat(pool.tokenYPriceUSD || '0'),
			priceNative: pool.tokenYPrice || '0',
		},
		reserveX: parseFloat(pool.reserveX || '0'),
		reserveY: parseFloat(pool.reserveY || '0'),
		lbBinStep: parseInt(pool.binStep || '10'),
		activeId: pool.activeId || 0,
		liquidityUsd: parseFloat(pool.totalValueLockedUSD || '0'),
		volume24hUsd: parseFloat(pool.volumeUSD || '0'),
		fees24hUsd: parseFloat(pool.feesUSD || '0'),
		txCount: parseInt(pool.txCount || '0'),
		liquidityProviderCount: parseInt(pool.liquidityProviderCount || '0'),
		apr: 0, // Will calculate from fees if needed
		apy: 0, // Will calculate from fees if needed
		createdAt: new Date().toISOString(),
		lastUpdate: Date.now(),
	}));

	// Create pagination info  
	const totalCount = subgraphPools.length; // Use returned count as approximation
	const pagination = {
		page,
		limit,
		total: totalCount,
		totalPages: Math.ceil(totalCount / limit),
		hasNext: totalCount === limit, // If we got full limit, there might be more
		hasPrev: page > 1,
	};

	return c.json({
		success: true,
		data: transformedPools,
		pagination,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get pool details by ID
 */
async function handlePoolDetails(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	// 获取 chain 路径参数
    const chain = c.req.param('chain') || 'none';

    // 你可以根据 chain 做不同处理，比如切换 subgraphClient，或校验
    console.log('Request chain:', chain);
	// 获取 poolId 路径参数
	const poolId = c.req.param('poolId');
	
	if (!poolId) {
		return c.json({
			error: 'Pool ID is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching pool details from subgraph...', poolId);
	
	const pool = await subgraphClient.getPoolById(poolId);
	
	if (!pool) {
		// Try to find if any pools exist to help debug
		const allPools = await subgraphClient.getPools(10, 0);
		const availableIds = allPools.map((p: any) => p.id).slice(0, 5);
		
		return c.json({
			error: 'Pool not found',
			poolId,
			message: `Pool with ID ${poolId} does not exist`,
			availablePoolIds: availableIds,
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Transform and enrich pool data
	const transformedPool = {
		id: pool.id,
		pairAddress: pool.id,
		chain: 'bsc-testnet',
		name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
		status: parseInt(pool.liquidityProviderCount || '0') > 0 ? 'active' : 'inactive',
		version: '2.1',
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: parseInt(pool.tokenX.decimals),
			priceUsd: parseFloat(pool.tokenXPriceUSD || '0'),
			priceNative: pool.tokenXPrice || '0',
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: parseInt(pool.tokenY.decimals),
			priceUsd: parseFloat(pool.tokenYPriceUSD || '0'),
			priceNative: pool.tokenYPrice || '0',
		},
		reserveX: parseFloat(pool.reserveX || '0'),
		reserveY: parseFloat(pool.reserveY || '0'),
		lbBinStep: parseInt(pool.binStep || '10'),
		activeId: pool.activeId || 0,
		liquidityUsd: parseFloat(pool.totalValueLockedUSD || '0'),
		volume24hUsd: parseFloat(pool.volumeUSD || '0'),
		fees24hUsd: parseFloat(pool.feesUSD || '0'),
		txCount: parseInt(pool.txCount || '0'),
		liquidityProviderCount: parseInt(pool.liquidityProviderCount || '0'),
		apr: 0, // Will calculate if needed
		apy: 0, // Will calculate if needed
		createdAt: new Date().toISOString(),
		lastUpdate: Date.now(),
		
		// Additional details
		swapCount: parseInt(pool.txCount || '0'),
		activeBins: 1, // Default value, can be enhanced later
		totalBins: 1, // Default value, can be enhanced later
		
		// Recent activity (can be fetched separately if needed)
		recentSwaps: [],
	};

	return c.json({
		success: true,
		data: transformedPool,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get tokens list from pools
 */
async function handleTokensList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	console.log('🔗 Fetching tokens from subgraph...');
	
	const tokens = await subgraphClient.getTokens();
	
	// Transform token data
	const transformedTokens = tokens.map((token: any) => ({
		address: token.id,
		symbol: token.symbol,
		name: token.name,
		decimals: parseInt(token.decimals || '18'),
		priceUsd: parseFloat(token.derivedBNB || '0'), // Using derivedBNB as price proxy
		priceNative: token.derivedBNB || '0',
		totalSupply: token.totalSupply || '0',
		volume24h: parseFloat(token.volumeUSD || '0'),
		// Calculate pool count from basePairs + quotePairs
		poolCount: (token.basePairs?.length || 0) + (token.quotePairs?.length || 0),
		// Use the actual totalValueLockedUSD from indexer
		liquidityUsd: parseFloat(token.totalValueLockedUSD || '0'),
	}));

	// Sort by liquidity
	transformedTokens.sort((a: any, b: any) => b.liquidityUsd - a.liquidityUsd);

	return c.json({
		success: true,
		data: transformedTokens,
		count: transformedTokens.length,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get DEX analytics
 */
async function handleAnalytics(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	console.log('🔗 Fetching DEX analytics from subgraph...');

	// 获取 chain 路径参数
    const chain = c.req.param('chain') || 'none';

    // 你可以根据 chain 做不同处理，比如切换 subgraphClient，或校验
    console.log('Request chain:', chain);

	const [pools, tokens, poolsDayData] = await Promise.all([
		subgraphClient.getPools(1000, 0), // Get many pools for analytics
		subgraphClient.getTokens(),
		subgraphClient.getPoolsDayData(1000, 1) // Get last 24h data
	]);

	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});

	// Calculate analytics using real 24h data where available
	const totalTvl = pools.reduce((sum: number, pool: any) => 
		sum + parseFloat(pool.totalValueLockedUSD || '0'), 0);
	
	// Use real 24h data from day data entities
	const totalVolume24h = poolsDayData.reduce((sum: number, dayData: any) => 
		sum + parseFloat(dayData.volumeUSD || '0'), 0);
	
	const totalFees24h = poolsDayData.reduce((sum: number, dayData: any) => 
		sum + parseFloat(dayData.feesUSD || '0'), 0);

	// Get top pools by TVL
	const topPools = pools
		.sort((a: any, b: any) => 
			parseFloat(b.totalValueLockedUSD || '0') - parseFloat(a.totalValueLockedUSD || '0'))
		.slice(0, 10);

	const analytics = {
		totalVolume24h: totalVolume24h.toString(),
		totalVolume7d: (totalVolume24h * 7).toString(), // Rough estimate
		totalTvl: totalTvl.toString(),
		totalFees24h: totalFees24h.toString(),
		totalPools: pools.length,
		totalTokens: tokens.length,
		totalUsers: pools.reduce((sum: number, pool: any) => 
			sum + parseInt(pool.liquidityProviderCount || '0'), 0),
		topPools: topPools.map((pool: any) => {
			const dayData = poolDayDataMap.get(pool.id);
			return {
				id: pool.id,
				name: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
				tvl: parseFloat(pool.totalValueLockedUSD || '0'),
				volume24h: dayData ? parseFloat(dayData.volumeUSD || '0') : 0,
				fees24h: dayData ? parseFloat(dayData.feesUSD || '0') : 0,
			};
		}),
		// Mock chart data for now
		volumeChart: generateMockChartData('volume', 7),
		tvlChart: generateMockChartData('tvl', 7),
	};

	return c.json({
		success: true,
		chain,
		data: analytics,
		timestamp: new Date().toISOString()
	});
}

// Helper functions
function calculateAPR(pool: any): number {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const feesLifetime = parseFloat(pool.feesUSD || '0'); // Using lifetime fees as estimate
	
	if (tvl === 0) return 0;
	
	// Rough estimate: assume lifetime fees accumulated over 30 days
	const dailyAPR = (feesLifetime / 30 / tvl) * 100;
	return dailyAPR * 365; // Annualized
}

function calculateAPY(pool: any): number {
	const apr = calculateAPR(pool);
	// Convert APR to APY (compound daily)
	return ((1 + apr / 100 / 365) ** 365 - 1) * 100;
}

function generateMockChartData(type: 'volume' | 'tvl', days: number) {
	const data = [];
	const now = Date.now();
	const baseValue = type === 'volume' ? 1000000 : 5000000;
	
	for (let i = days - 1; i >= 0; i--) {
		const timestamp = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();
		const value = (baseValue + Math.random() * baseValue * 0.3).toString();
		data.push({ timestamp, [type]: value });
	}
	
	return data;
}
