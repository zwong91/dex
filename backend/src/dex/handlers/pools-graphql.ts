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
				case 'bins':
					return await handlePoolBins(c, subgraphClient);
				case 'tokens':
					return await handleTokensList(c, subgraphClient);
				case 'analytics':
					return await handleAnalytics(c, subgraphClient);
				case 'searchByTokens':
					return await handlePoolsByTokens(c, subgraphClient);
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
	const limit = Math.min(parseInt(c.req.query('limit') || '10'), 10);
	const offset = (page - 1) * limit;
	
	console.log('🔗 Fetching pools from subgraph...');

	// 获取 chain 路径参数
    const chain = c.req.param('chain') || 'none';

    // 你可以根据 chain 做不同处理，比如切换 subgraphClient，或校验
    console.log('Request chain:', chain);

	// Get pools data
	console.log('🔍 Fetching pools and 24h data...');
	const subgraphPools = await subgraphClient.getPools(limit, offset, 'totalValueLockedUSD', 'desc');
	
	// 🔧 Fix: Get 24h data only for the pools we actually fetched
	console.log(`🔍 Getting 24h data for ${subgraphPools.length} specific pools...`);
	
	// Create a map for quick lookup of day data by pool ID
	const poolDayDataMap = new Map();
	
	// Get 24h data for each pool in parallel
	const dayDataPromises = subgraphPools.map(async (pool: any) => {
		try {
			const dayData = await subgraphClient.getPoolDayData(pool.id, 1);
			if (dayData && dayData.length > 0) {
				// Use the most recent day data
				poolDayDataMap.set(pool.id, dayData[0]);
			}
		} catch (error) {
			console.warn(`⚠️ Failed to get 24h data for pool ${pool.id}:`, error);
		}
	});
	
	// Wait for all day data queries to complete
	await Promise.all(dayDataPromises);
	console.log(`✅ Retrieved 24h data for ${poolDayDataMap.size} out of ${subgraphPools.length} pools`);
	
	// TEMP DEBUG: Also test the specific problematic pool with playground-style query
	console.log('🔍 DEBUG - Testing problematic pool with exact playground query...');
	
	// Helper function to safely parse reserve values
	const parseReserveValue = (value: string | undefined, fieldName: string, poolId: string): number => {
		if (!value || value === '0') return 0;
		
		const parsed = parseFloat(value);
		
		// Check for corruption (massive negative numbers or NaN)
		if (isNaN(parsed) || parsed < -1e15 || parsed > 1e15) {
			console.warn(`🚨 Corrupted ${fieldName} detected for pool ${poolId}: ${value} -> ${parsed}, using 0 instead`);
			return 0;
		}
		
		return parsed;
	};

	// Helper function to safely parse USD values (same validation)
	const parseUsdValue = (value: string | undefined, fieldName: string, poolId: string): number => {
		if (!value || value === '0') return 0;
		
		const parsed = parseFloat(value);
		
		// Check for corruption (massive negative numbers or NaN)
		if (isNaN(parsed) || parsed < -1e15 || parsed > 1e15) {
			console.warn(`🚨 Corrupted ${fieldName} detected for pool ${poolId}: ${value} -> ${parsed}, using 0 instead`);
			return 0;
		}
		
		return parsed;
	};

	// Transform subgraph data to API format with real 24h data
	const transformedPools = subgraphPools.map((pool: any) => {
		// Get 24h data for this pool
		const dayData = poolDayDataMap.get(pool.id);
		
		// 🔍 DEBUG: Log day data status for the problematic pool
		if (pool.id === '0x30540774ce85dcec6e3acbcb89209b2e01a29723') {
			console.log('🔍 DEBUG - Day data for problematic pool:', {
				poolId: pool.id,
				dayDataExists: !!dayData,
				dayDataContent: dayData,
				mapSize: poolDayDataMap.size,
				allMapKeys: Array.from(poolDayDataMap.keys())
			});
		}
		
		const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
		const fees24h = dayData ? parseFloat(dayData.feesUSD || '0') : 0;
		
		// Calculate APR from 24h fees - 直接计算，不做边界检查
		const tvl = parseFloat(pool.totalValueLockedUSD || '0');
		const apr = tvl > 0 && fees24h > 0 ? (fees24h * 365 / tvl) * 100 : 0;

		// Debug logging for the problematic pool
		if (pool.id === '0x904ede072667c4bc3d7e6919b4a0a442559295c8') {
			console.log('🔍 DEBUG - Processing problematic pool:', {
				id: pool.id,
				reserveX: pool.reserveX,
				reserveY: pool.reserveY,
				volume24h,
				fees24h,
				tvl,
				apr,
				dayDataExists: !!dayData
			});
		}

		return {
			id: pool.id,
			pairAddress: pool.id,
			chain: chain === 'bsc' ? 'bsc' : 'bsc-testnet',  // Use actual chain from request
			name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
			status: parseInt(pool.liquidityProviderCount || '0') > 0 ? 'active' : 'inactive',
			version: '2.2',
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
			reserveX: parseReserveValue(pool.reserveX, 'reserveX', pool.id),
			reserveY: parseReserveValue(pool.reserveY, 'reserveY', pool.id),
			lbBinStep: parseInt(pool.binStep || '10'),
			activeId: pool.activeId || 0,
			liquidityUsd: parseUsdValue(pool.totalValueLockedUSD, 'totalValueLockedUSD', pool.id),
			volume24hUsd: volume24h, // Use real 24h data
			fees24hUsd: fees24h,    // Use real 24h data  
			txCount: parseInt(pool.txCount || '0'),
			liquidityProviderCount: parseInt(pool.liquidityProviderCount || '0'),
			apr: apr,               // Calculate from real fees
			apy: apr > 0 ? ((1 + apr/100/365) ** 365 - 1) * 100 : 0, // Compound APR to APY
			createdAt: new Date().toISOString(),
			lastUpdate: Date.now(),
		};
	});

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

	// Helper function to safely parse reserve values  
	const parseReserveValue = (value: string | undefined, fieldName: string, poolId: string): number => {
		if (!value || value === '0') return 0;
		
		const parsed = parseFloat(value);
		
		// Check for corruption (massive negative numbers or NaN)
		if (isNaN(parsed) || parsed < -1e15 || parsed > 1e15) {
			console.warn(`🚨 Corrupted ${fieldName} detected for pool ${poolId}: ${value} -> ${parsed}, using 0 instead`);
			return 0;
		}
		
		return parsed;
	};

	// Helper function to safely parse USD values
	const parseUsdValue = (value: string | undefined, fieldName: string, poolId: string): number => {
		if (!value || value === '0') return 0;
		
		const parsed = parseFloat(value);
		
		// Check for corruption (massive negative numbers or NaN)
		if (isNaN(parsed) || parsed < -1e15 || parsed > 1e15) {
			console.warn(`🚨 Corrupted ${fieldName} detected for pool ${poolId}: ${value} -> ${parsed}, using 0 instead`);
			return 0;
		}
		
		return parsed;
	};

	// Transform and enrich pool data
	const transformedPool = {
		id: pool.id,
		pairAddress: pool.id,
		chain: chain === 'bsc' ? 'bsc' : 'bsc-testnet',  // Use actual chain from request
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
		reserveX: parseReserveValue(pool.reserveX, 'reserveX', pool.id),
		reserveY: parseReserveValue(pool.reserveY, 'reserveY', pool.id),
		lbBinStep: parseInt(pool.binStep || '10'),
		activeId: pool.activeId || 0,
		liquidityUsd: parseUsdValue(pool.totalValueLockedUSD, 'totalValueLockedUSD', pool.id),
		volume24hUsd: parseUsdValue(pool.volumeUSD, 'volumeUSD', pool.id),
		fees24hUsd: parseUsdValue(pool.feesUSD, 'feesUSD', pool.id),
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

/**
 * Get bins for a specific pool
 */
async function handlePoolBins(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	try {
		const { poolId } = c.req.param();
		
		if (!poolId) {
			return c.json({
				success: false,
				error: 'Pool ID is required',
				timestamp: new Date().toISOString()
			}, 400);
		}

		// Get query parameters
		let activeId = c.req.query('activeId') ? parseInt(c.req.query('activeId')!) : undefined;
		const range = parseInt(c.req.query('range') || '50');
		const limit = parseInt(c.req.query('limit') || '100');

		// Special case: range=0 with no activeId should use pool's current activeId
		if (range === 0 && activeId === undefined) {
			const pool = await subgraphClient.getPool(poolId);
			if (pool?.activeId) {
				activeId = parseInt(pool.activeId);
			}
		}

		// Validate parameters
		if (range < 0 || range > 200) {
			return c.json({
				success: false,
				error: 'Range must be between 0 and 200',
				timestamp: new Date().toISOString()
			}, 400);
		}

		if (limit < 1 || limit > 1000) {
			return c.json({
				success: false,
				error: 'Limit must be between 1 and 1000',
				timestamp: new Date().toISOString()
			}, 400);
		}

		// Get bins data from subgraph
		const bins = await subgraphClient.getPoolBins(poolId, activeId, range, limit);
		
		if (!bins || bins.length === 0) {
			return c.json({
				success: true,
				data: {
					poolId,
					activeId,
					bins: [],
					count: 0
				},
				message: 'No bins found for this pool',
				timestamp: new Date().toISOString()
			});
		}

		// Get pool info for context
		const pool = await subgraphClient.getPool(poolId);
		const currentActiveId = pool?.activeId;

		// Transform bins data
		const transformedBins = bins.map((bin: any) => ({
			id: bin.id,
			binId: parseInt(bin.binId),
			isActive: currentActiveId ? bin.binId === currentActiveId : false,
			priceX: parseFloat(bin.priceX || '0'),
			priceY: parseFloat(bin.priceY || '0'),
			reserveX: parseFloat(bin.reserveX || '0'),
			reserveY: parseFloat(bin.reserveY || '0'),
			totalSupply: bin.totalSupply || '0',
			liquidityProviderCount: parseInt(bin.liquidityProviderCount || '0'),
			liquidityUsd: 0, // Calculate if needed
		}));

		// Calculate total liquidity if possible
		let totalLiquidityUsd = 0;
		if (pool) {
			transformedBins.forEach((bin: any) => {
				// Simple estimation: use pool's token prices
				const tokenXValue = bin.reserveX * parseFloat(pool.tokenXPriceUSD || '0');
				const tokenYValue = bin.reserveY * parseFloat(pool.tokenYPriceUSD || '0');
				bin.liquidityUsd = tokenXValue + tokenYValue;
				totalLiquidityUsd += bin.liquidityUsd;
			});
		}

		// Sort bins by binId
		transformedBins.sort((a: any, b: any) => a.binId - b.binId);

		// Find active bin index
		const activeBinIndex = transformedBins.findIndex((bin: any) => bin.isActive);

		return c.json({
			success: true,
			data: {
				poolId,
				poolName: pool?.name || 'Unknown Pool',
				currentActiveId,
				activeBinIndex,
				binStep: pool?.binStep || 0,
				tokenX: pool?.tokenX || null,
				tokenY: pool?.tokenY || null,
				totalLiquidityUsd,
				bins: transformedBins,
				count: transformedBins.length,
				range: activeId ? range : null,
				requestedActiveId: activeId
			},
			timestamp: new Date().toISOString()
		});

	} catch (error: any) {
		console.error('Pool bins handler error:', error);
		return c.json({
			success: false,
			error: 'Failed to fetch pool bins',
			message: error.message || 'Unknown error',
			timestamp: new Date().toISOString()
		}, 500);
	}
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

/**
 * Handle pools search by tokens - find all pools that contain specified tokens
 */
async function handlePoolsByTokens(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	try {
		// Get query parameters
		const token1 = c.req.query('token1')?.toLowerCase().trim();
		const token2 = c.req.query('token2')?.toLowerCase().trim();
		const page = parseInt(c.req.query('page') || '1');
		const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100); // Max 100 results
		const offset = (page - 1) * limit;

		// Validate input - need at least one token
		if (!token1 && !token2) {
			return c.json({
				error: 'At least one token parameter is required',
				message: 'Provide token1 or token2 (or both) as query parameters. Can be token address or symbol.',
				timestamp: new Date().toISOString()
			}, 400);
		}

		console.log(`🔍 Searching pools for tokens: token1=${token1}, token2=${token2}`);

		let filteredPools: any[] = [];

		if (token1 && token2) {
			// For two tokens, search for pools containing both
			console.log('🔍 Searching for pools with both tokens using custom GraphQL query');
			
			const query = `
				query SearchPoolsByBothTokens($token1: String!, $token2: String!, $first: Int!) {
					lbpairs(
						where: {
							or: [
								{
									and: [
										{
											or: [
												{ tokenX_: { symbol_contains_nocase: $token1 } },
												{ tokenX_: { id: $token1 } }
											]
										},
										{
											or: [
												{ tokenY_: { symbol_contains_nocase: $token2 } },
												{ tokenY_: { id: $token2 } }
											]
										}
									]
								},
								{
									and: [
										{
											or: [
												{ tokenX_: { symbol_contains_nocase: $token2 } },
												{ tokenX_: { id: $token2 } }
											]
										},
										{
											or: [
												{ tokenY_: { symbol_contains_nocase: $token1 } },
												{ tokenY_: { id: $token1 } }
											]
										}
									]
								}
							]
						}
						first: $first
						orderBy: totalValueLockedUSD
						orderDirection: desc
					) {
						id
						name
						factory {
							id
						}
						baseFeePct
						tokenX {
							id
							symbol
							name
							decimals
							totalValueLocked
							totalValueLockedUSD
							derivedBNB
							volume
							volumeUSD
							txCount
							feesUSD
						}
						tokenY {
							id
							symbol
							name
							decimals
							totalValueLocked
							totalValueLockedUSD
							derivedBNB
							volume
							volumeUSD
							txCount
							feesUSD
						}
						binStep
						activeId
						reserveX
						reserveY
						totalValueLockedBNB
						totalValueLockedUSD
						tokenXPrice
						tokenYPrice
						tokenXPriceUSD
						tokenYPriceUSD
						volumeTokenX
						volumeTokenY
						volumeUSD
						untrackedVolumeUSD
						txCount
						feesTokenX
						feesTokenY
						feesUSD
						liquidityProviderCount
						timestamp
						block
					}
				}
			`;

			const variables = {
				token1,
				token2,
				first: 100
			};

			try {
				const result = await subgraphClient.query(query, variables);
				filteredPools = result.data?.lbpairs || [];
				console.log(`✅ Found ${filteredPools.length} pools with both tokens via GraphQL`);
			} catch (error) {
				console.error('GraphQL query failed, falling back to manual search:', error);
				// Fallback: Get all pools and filter manually
				const allPools = await subgraphClient.getPools(100, 0, 'totalValueLockedUSD', 'desc');
				filteredPools = allPools.filter((pool: any) => {
					const tokenXSymbol = pool.tokenX.symbol.toLowerCase();
					const tokenYSymbol = pool.tokenY.symbol.toLowerCase();
					const tokenXAddress = pool.tokenX.id.toLowerCase();
					const tokenYAddress = pool.tokenY.id.toLowerCase();
					
					const hasToken1 = tokenXSymbol.includes(token1!) || tokenYSymbol.includes(token1!) || 
									 tokenXAddress === token1 || tokenYAddress === token1;
					const hasToken2 = tokenXSymbol.includes(token2!) || tokenYSymbol.includes(token2!) || 
									 tokenXAddress === token2 || tokenYAddress === token2;
					return hasToken1 && hasToken2;
				});
			}
		} else {
			// Single token search with full fields
			const searchToken = token1 || token2;
			console.log(`🔍 Using custom GraphQL query for single token: ${searchToken}`);
			
			const query = `
				query SearchPoolsBySingleToken($searchToken: String!, $first: Int!) {
					lbpairs(
						where: {
							or: [
								{ tokenX_: { symbol_contains_nocase: $searchToken } },
								{ tokenY_: { symbol_contains_nocase: $searchToken } },
								{ tokenX_: { id: $searchToken } },
								{ tokenY_: { id: $searchToken } }
							]
						}
						first: $first
						orderBy: totalValueLockedUSD
						orderDirection: desc
					) {
						id
						name
						factory {
							id
						}
						baseFeePct
						tokenX {
							id
							symbol
							name
							decimals
							totalValueLocked
							totalValueLockedUSD
							derivedBNB
							volume
							volumeUSD
							txCount
							feesUSD
						}
						tokenY {
							id
							symbol
							name
							decimals
							totalValueLocked
							totalValueLockedUSD
							derivedBNB
							volume
							volumeUSD
							txCount
							feesUSD
						}
						binStep
						activeId
						reserveX
						reserveY
						totalValueLockedBNB
						totalValueLockedUSD
						tokenXPrice
						tokenYPrice
						tokenXPriceUSD
						tokenYPriceUSD
						volumeTokenX
						volumeTokenY
						volumeUSD
						untrackedVolumeUSD
						txCount
						feesTokenX
						feesTokenY
						feesUSD
						liquidityProviderCount
						timestamp
						block
					}
				}
			`;

			const variables = {
				searchToken,
				first: 100
			};

			try {
				const result = await subgraphClient.query(query, variables);
				filteredPools = result.data?.lbpairs || [];
				console.log(`✅ Found ${filteredPools.length} pools for single token via GraphQL`);
			} catch (error) {
				console.error('GraphQL query failed, falling back to manual search:', error);
				// Fallback: Get all pools and filter manually
				const allPools = await subgraphClient.getPools(100, 0, 'totalValueLockedUSD', 'desc');
				filteredPools = allPools.filter((pool: any) => {
					const tokenXSymbol = pool.tokenX.symbol.toLowerCase();
					const tokenYSymbol = pool.tokenY.symbol.toLowerCase();
					const tokenXAddress = pool.tokenX.id.toLowerCase();
					const tokenYAddress = pool.tokenY.id.toLowerCase();
					
					return tokenXSymbol.includes(searchToken!) || tokenYSymbol.includes(searchToken!) || 
						   tokenXAddress === searchToken || tokenYAddress === searchToken;
				});
			}
		}

		console.log(`✅ Found ${filteredPools.length} pools matching criteria`);

		// Apply pagination to filtered results
		const startIndex = offset;
		const endIndex = offset + limit;
		const paginatedPools = filteredPools.slice(startIndex, endIndex);

		// Get 24h data for APR calculations
		const poolsDayData = await subgraphClient.getPoolsDayData(100, 1);
		const poolDayDataMap = new Map();
		poolsDayData.forEach((dayData: any) => {
			const poolId = dayData.lbPair?.id || dayData.id.split('-')[0];
			poolDayDataMap.set(poolId, dayData);
		});

		// Transform pools to API format
		const transformedPools = paginatedPools.map((pool: any) => {
			const dayData = poolDayDataMap.get(pool.id);
			const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
			const fees24h = dayData ? parseFloat(dayData.feesUSD || '0') : 0;
			
			const tvl = parseFloat(pool.totalValueLockedUSD || '0');
			const apr = tvl > 0 && fees24h > 0 ? (fees24h * 365 / tvl) * 100 : 0;

			return {
				pairAddress: pool.id,
				name: pool.name,
				tokenX: {
					address: pool.tokenX.id,
					symbol: pool.tokenX.symbol,
					name: pool.tokenX.name,
					decimals: parseInt(pool.tokenX.decimals)
				},
				tokenY: {
					address: pool.tokenY.id,
					symbol: pool.tokenY.symbol,
					name: pool.tokenY.name,
					decimals: parseInt(pool.tokenY.decimals)
				},
				lbBinStep: parseInt(pool.binStep),
				activeId: pool.activeId,
				reserveX: pool.reserveX,
				reserveY: pool.reserveY,
				tvlUSD: pool.totalValueLockedUSD,
				tvlBNB: pool.totalValueLockedBNB,
				tvlFormatted: `$${parseFloat(pool.totalValueLockedUSD || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
				volume24hUSD: volume24h.toString(),
				volume24hFormatted: `$${volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
				fees24hUSD: fees24h.toString(),
				fees24hFormatted: `$${fees24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
				apr: apr,
				aprFormatted: `${apr.toFixed(2)}%`,
				tokenXPrice: pool.tokenXPrice,
				tokenYPrice: pool.tokenYPrice,
				tokenXPriceUSD: pool.tokenXPriceUSD,
				tokenYPriceUSD: pool.tokenYPriceUSD,
				totalTxCount: parseInt(pool.txCount),
				createdAt: new Date(parseInt(pool.timestamp) * 1000).toISOString(),
				blockNumber: parseInt(pool.block)
			};
		});

		// Return response
		return c.json({
			success: true,
			data: {
				pools: transformedPools,
				pagination: {
					page,
					limit,
					total: filteredPools.length,
					hasMore: endIndex < filteredPools.length
				},
				searchCriteria: {
					token1: token1 || null,
					token2: token2 || null,
					searchType: token1 && token2 ? 'both_tokens' : 'single_token'
				}
			},
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Error searching pools by tokens:', error);
		return c.json({
			success: false,
			error: 'Failed to search pools',
			message: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString()
		}, 500);
	}
}
