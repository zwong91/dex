/**
 * DEX Users Handlers - Pure GraphQL Implementation with Hono
 */

import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

/**
 * Create users handler factory
 */
export function createUsersHandler(action: string) {
	return async function usersHandler(c: Context<{ Bindings: Env }>) {
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
				case 'binIds':
					return await handleUserBinIds(c, subgraphClient);
				case 'poolIds':
					return await handleUserPoolIds(c, subgraphClient);
				case 'history':
					return await handleUserHistory(c, subgraphClient);
				case 'lifetimeStats':
					return await handleUserLifetimeStats(c, subgraphClient);
				case 'feesEarned':
					return await handleUserFeesEarned(c, subgraphClient);
				case 'poolBalances':
					return await handleUserPoolBalances(c, subgraphClient);
				default:
					return c.json({
						error: 'Invalid action',
						timestamp: new Date().toISOString()
					}, 400);
			}

		} catch (error) {
			console.error('Users handler error:', error);
			return c.json({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	};
}

/**
 * Get user bin IDs
 */
async function handleUserBinIds(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user-related data from subgraph...', userAddress);
	
	// Since we don't have user position entities, we look for traces involving the user
	// This is a workaround - in a complete indexer, user positions would be tracked separately
	const traces = await subgraphClient.getTraces(1000, 0); // Get recent traces
	
	// Filter traces that might involve this user (this is limited without proper user indexing)
	// In reality, you'd need to index user addresses in the subgraph
	const userTraces = traces.filter((trace: any) => 
		trace.txHash && trace.binId // Basic validation
	);
	
	// Extract unique bin IDs from traces (this is an approximation)
	const binIds = userTraces
		.map((trace: any) => trace.binId)
		.filter((binId: string, index: number, arr: string[]) => arr.indexOf(binId) === index);

	return c.json({
		success: true,
		data: {
			userAddress,
			binIds,
			count: binIds.length,
		},
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user pool IDs
 */
async function handleUserPoolIds(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user pool IDs from subgraph...', userAddress);
	
	// Since we don't have user position entities, we look for traces involving the user
	const traces = await subgraphClient.getTraces(1000, 0);
	
	// Extract unique pool IDs from traces (approximation without proper user indexing)
	const poolIds = traces
		.map((trace: any) => trace.lbPair)
		.filter((poolId: string, index: number, arr: string[]) => arr.indexOf(poolId) === index);

	return c.json({
		success: true,
		data: {
			userAddress,
			poolIds,
			count: poolIds.length,
		},
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user transaction history
 */
async function handleUserHistory(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	const page = parseInt(c.req.query('page') || '1');
	const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user history from subgraph...', userAddress);
	
	const offset = (page - 1) * limit;
	// Since we don't have user-specific transaction indexing, get recent traces
	const traces = await subgraphClient.getTraces(limit, offset);
	
	// Transform trace data to transaction format (this is a limited approximation)
	const transformedTransactions = traces.map((trace: any) => ({
		id: trace.id,
		type: trace.type || 'unknown',
		timestamp: Date.now(), // Traces don't have timestamp in current schema
		pool: {
			id: trace.lbPair,
			name: `Pool ${trace.lbPair?.slice(0, 8)}...`,
		},
		amounts: {
			tokenIn: trace.amountXIn || trace.amountYIn || '0',
			tokenOut: trace.amountXOut || trace.amountYOut || '0',
			tokenX: trace.amountXIn || trace.amountXOut || '0',
			tokenY: trace.amountYIn || trace.amountYOut || '0',
		},
		tokens: {
			tokenIn: null, // Not available in current schema
			tokenOut: null,
			tokenX: null,
			tokenY: null,
		},
		fee: '0', // Not available in current schema
		gasUsed: '0',
		txHash: trace.txHash,
		blockNumber: 0, // Not available in current schema
	}));

	const pagination = {
		page,
		limit,
		total: transformedTransactions.length, // In a real app, get total count from subgraph
		hasNext: transformedTransactions.length === limit,
		hasPrev: page > 1,
	};

	return c.json({
		success: true,
		data: {
			userAddress,
			transactions: transformedTransactions,
		},
		pagination,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user lifetime stats
 */
async function handleUserLifetimeStats(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user lifetime stats from subgraph...', userAddress);
	
	// Since we don't have user-specific data, provide basic stats from traces
	const traces = await subgraphClient.getTraces(100, 0);
	
	// Calculate simplified lifetime stats (this is an approximation)
	const stats = {
		userAddress,
		totalLiquidityProvided: '0', // Not available in current schema
		totalVolumeTraded: '0', // Not available in current schema
		totalFeesEarned: '0', // Not available in current schema
		totalTransactions: traces.length,
		totalPools: 1, // Simplified
		firstTransactionDate: null,
		lastTransactionDate: new Date().toISOString(),
	};

	return c.json({
		success: true,
		data: stats,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user fees earned
 */
async function handleUserFeesEarned(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user fees earned from subgraph...', userAddress);
	
	const positions = await subgraphClient.getUserPositions(userAddress);
	
	// Calculate fees earned per position
	const feesEarned = positions.map((position: any) => {
		const poolShare = parseFloat(position.liquidity || '0') / parseFloat(position.pool.totalLiquidity || '1');
		const poolFeesUSD = parseFloat(position.pool.feesUSD || '0');
		const userFeesUSD = poolFeesUSD * poolShare;
		
		return {
			poolId: position.pool.id,
			poolName: `${position.pool.tokenX.symbol}/${position.pool.tokenY.symbol}`,
			liquidityShare: poolShare,
			feesEarnedUSD: userFeesUSD.toString(),
			position: {
				binId: position.binId,
				liquidity: position.liquidity,
				liquidityUSD: position.liquidityUSD,
			},
		};
	});

	const totalFeesEarned = feesEarned.reduce((sum: number, fee: any) => 
		sum + parseFloat(fee.feesEarnedUSD), 0);

	return c.json({
		success: true,
		data: {
			userAddress,
			totalFeesEarnedUSD: totalFeesEarned.toString(),
			feesByPool: feesEarned,
		},
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user balances in a specific pool
 */
async function handleUserPoolBalances(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	const poolId = c.req.param('poolId');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	if (!poolId) {
		return c.json({
			error: 'Pool ID is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user pool balances from subgraph...', userAddress, poolId);
	
	const userPositions = await subgraphClient.getUserPositionsInPool(userAddress, poolId);
	
	if (!userPositions || userPositions.length === 0) {
		return c.json({
			success: true,
			data: {
				userAddress,
				poolId,
				hasPosition: false,
				positions: [],
				totalLiquidityUSD: '0',
			},
			timestamp: new Date().toISOString()
		});
	}

	// Transform position data
	const transformedPositions = userPositions.map((position: any) => ({
		binId: position.binId,
		liquidity: position.liquidity,
		liquidityUSD: position.liquidityUSD,
		tokenXBalance: position.tokenXBalance || '0',
		tokenYBalance: position.tokenYBalance || '0',
		createdAt: position.createdAtTimestamp ? 
			new Date(parseInt(position.createdAtTimestamp) * 1000).toISOString() : null,
		lastUpdated: position.updatedAtTimestamp ? 
			new Date(parseInt(position.updatedAtTimestamp) * 1000).toISOString() : null,
	}));

	const totalLiquidityUSD = transformedPositions.reduce((sum: number, position: any) => 
		sum + parseFloat(position.liquidityUSD || '0'), 0);

	return c.json({
		success: true,
		data: {
			userAddress,
			poolId,
			hasPosition: true,
			positions: transformedPositions,
			totalLiquidityUSD: totalLiquidityUSD.toString(),
			positionCount: transformedPositions.length,
		},
		timestamp: new Date().toISOString()
	});
}

// Helper function to validate Ethereum address
function isValidAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}
