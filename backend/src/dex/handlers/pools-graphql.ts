/**
 * DEX Pools Handlers - Pure GraphQL Implementation with Hono
 * 
 * All handlers now use GraphQL subgraph exclusively for data.
 * No database fallbacks - the subgraph is the single source of truth.
 */

import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

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
	
	const subgraphPools = await subgraphClient.getPools(limit, offset, 'timestamp', 'desc');
	
	// Transform subgraph data to API format
	const transformedPools = subgraphPools.map((pool: any) => ({
		id: pool.id,
		pairAddress: pool.id,
		chain: 'bsc-testnet',
		name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
		status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
		version: '2.1',
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: pool.tokenX.decimals,
			priceUsd: parseFloat(pool.tokenX.priceUSD || '0'),
			priceNative: pool.tokenX.priceNative || '0',
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: pool.tokenY.decimals,
			priceUsd: parseFloat(pool.tokenY.priceUSD || '0'),
			priceNative: pool.tokenY.priceNative || '0',
		},
		reserveX: parseFloat(pool.reserveX || '0'),
		reserveY: parseFloat(pool.reserveY || '0'),
		lbBinStep: parseInt(pool.binStep || '0'),
		liquidityUsd: parseFloat(pool.totalValueLockedUSD || '0'),
		volume24hUsd: parseFloat(pool.volumeUSD24h || '0'),
		fees24hUsd: parseFloat(pool.feesUSD24h || '0'),
		apr: calculateAPR(pool),
		apy: calculateAPY(pool),
		createdAt: pool.createdAtTimestamp ? new Date(parseInt(pool.createdAtTimestamp) * 1000).toISOString() : new Date().toISOString(),
		lastUpdate: pool.updatedAtTimestamp ? parseInt(pool.updatedAtTimestamp) : Date.now(),
	}));

	// Create pagination info
	const totalCount = await subgraphClient.getPoolsCount();
	const pagination = {
		page,
		limit,
		total: totalCount,
		totalPages: Math.ceil(totalCount / limit),
		hasNext: page * limit < totalCount,
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
		return c.json({
			error: 'Pool not found',
			poolId,
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Transform and enrich pool data
	const transformedPool = {
		id: pool.id,
		pairAddress: pool.id,
		chain: 'bsc-testnet',
		name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
		status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
		version: '2.1',
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: pool.tokenX.decimals,
			priceUsd: parseFloat(pool.tokenX.priceUSD || '0'),
			priceNative: pool.tokenX.priceNative || '0',
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: pool.tokenY.decimals,
			priceUsd: parseFloat(pool.tokenY.priceUSD || '0'),
			priceNative: pool.tokenY.priceNative || '0',
		},
		reserveX: parseFloat(pool.reserveX || '0'),
		reserveY: parseFloat(pool.reserveY || '0'),
		lbBinStep: parseInt(pool.binStep || '0'),
		liquidityUsd: parseFloat(pool.totalValueLockedUSD || '0'),
		volume24hUsd: parseFloat(pool.volumeUSD24h || '0'),
		fees24hUsd: parseFloat(pool.feesUSD24h || '0'),
		apr: calculateAPR(pool),
		apy: calculateAPY(pool),
		createdAt: pool.createdAtTimestamp ? new Date(parseInt(pool.createdAtTimestamp) * 1000).toISOString() : new Date().toISOString(),
		lastUpdate: pool.updatedAtTimestamp ? parseInt(pool.updatedAtTimestamp) : Date.now(),
		
		// Additional details
		liquidityProviderCount: parseInt(pool.liquidityProviderCount || '0'),
		swapCount: parseInt(pool.swapCount || '0'),
		activeBins: pool.bins ? pool.bins.filter((bin: any) => parseFloat(bin.liquidity || '0') > 0).length : 0,
		totalBins: pool.bins ? pool.bins.length : 0,
		
		// Recent activity
		recentSwaps: pool.swaps ? pool.swaps.slice(0, 10).map((swap: any) => ({
			id: swap.id,
			timestamp: parseInt(swap.timestamp),
			amountIn: swap.amountIn,
			amountOut: swap.amountOut,
			tokenIn: swap.tokenIn,
			tokenOut: swap.tokenOut,
			txHash: swap.transaction?.id,
		})) : [],
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
		decimals: token.decimals,
		priceUsd: parseFloat(token.priceUSD || '0'),
		priceNative: token.priceNative || '0',
		totalSupply: token.totalSupply || '0',
		volume24h: token.volume24h || '0',
		poolCount: token.pools ? token.pools.length : 0,
		liquidityUsd: token.pools ? 
			token.pools.reduce((sum: number, pool: any) => 
				sum + parseFloat(pool.totalValueLockedUSD || '0'), 0) : 0,
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
	
	const [pools, tokens] = await Promise.all([
		subgraphClient.getPools(1000, 0), // Get many pools for analytics
		subgraphClient.getTokens()
	]);

	// Calculate analytics
	const totalTvl = pools.reduce((sum: number, pool: any) => 
		sum + parseFloat(pool.totalValueLockedUSD || '0'), 0);
	
	const totalVolume24h = pools.reduce((sum: number, pool: any) => 
		sum + parseFloat(pool.volumeUSD24h || '0'), 0);
	
	const totalFees24h = pools.reduce((sum: number, pool: any) => 
		sum + parseFloat(pool.feesUSD24h || '0'), 0);

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
		topPools: topPools.map((pool: any) => ({
			id: pool.id,
			name: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
			tvl: parseFloat(pool.totalValueLockedUSD || '0'),
			volume24h: parseFloat(pool.volumeUSD24h || '0'),
			fees24h: parseFloat(pool.feesUSD24h || '0'),
		})),
		// Mock chart data for now
		volumeChart: generateMockChartData('volume', 7),
		tvlChart: generateMockChartData('tvl', 7),
	};

	return c.json({
		success: true,
		data: analytics,
		timestamp: new Date().toISOString()
	});
}

// Helper functions
function calculateAPR(pool: any): number {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const fees24h = parseFloat(pool.feesUSD24h || '0');
	
	if (tvl === 0) return 0;
	
	const dailyAPR = (fees24h / tvl) * 100;
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
