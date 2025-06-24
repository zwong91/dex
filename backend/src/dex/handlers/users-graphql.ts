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

	console.log('🔗 Fetching user bin IDs from subgraph...', userAddress);
	
	const positions = await subgraphClient.getUserPositions(userAddress);
	
	// Extract unique bin IDs
	const binIds = positions
		.map((position: any) => position.binId)
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
	
	const positions = await subgraphClient.getUserPositions(userAddress);
	
	// Extract unique pool IDs
	const poolIds = positions
		.map((position: any) => position.pool.id)
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
	const transactions = await subgraphClient.getUserTransactions(userAddress, limit, offset);
	
	// Transform transaction data
	const transformedTransactions = transactions.map((tx: any) => ({
		id: tx.id,
		type: tx.type || 'swap',
		timestamp: parseInt(tx.timestamp),
		pool: {
			id: tx.pool?.id,
			name: tx.pool ? `${tx.pool.tokenX.symbol}/${tx.pool.tokenY.symbol}` : 'Unknown',
		},
		amounts: {
			tokenIn: tx.amountIn || '0',
			tokenOut: tx.amountOut || '0',
			tokenX: tx.amountX || '0',
			tokenY: tx.amountY || '0',
		},
		tokens: {
			tokenIn: tx.tokenIn,
			tokenOut: tx.tokenOut,
			tokenX: tx.tokenX,
			tokenY: tx.tokenY,
		},
		fee: tx.fee || '0',
		gasUsed: tx.gasUsed || '0',
		txHash: tx.transaction?.id,
		blockNumber: tx.blockNumber,
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
	
	const [positions, transactions] = await Promise.all([
		subgraphClient.getUserPositions(userAddress),
		subgraphClient.getUserTransactions(userAddress, 1000, 0) // Get many transactions for stats
	]);

	// Calculate lifetime stats
	const totalLiquidity = positions.reduce((sum: number, position: any) => 
		sum + parseFloat(position.liquidityUSD || '0'), 0);
	
	const totalVolume = transactions
		.filter((tx: any) => tx.type === 'swap')
		.reduce((sum: number, tx: any) => 
			sum + parseFloat(tx.amountUSD || '0'), 0);
	
	const totalFees = transactions.reduce((sum: number, tx: any) => 
		sum + parseFloat(tx.feeUSD || '0'), 0);

	const stats = {
		userAddress,
		totalLiquidityProvided: totalLiquidity.toString(),
		totalVolumeTraded: totalVolume.toString(),
		totalFeesEarned: totalFees.toString(),
		totalTransactions: transactions.length,
		totalPools: positions.length,
		firstTransactionDate: transactions.length > 0 ? 
			new Date(Math.min(...transactions.map((tx: any) => parseInt(tx.timestamp) * 1000))).toISOString() : null,
		lastTransactionDate: transactions.length > 0 ? 
			new Date(Math.max(...transactions.map((tx: any) => parseInt(tx.timestamp) * 1000))).toISOString() : null,
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
