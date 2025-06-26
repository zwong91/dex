/**
 * DEX Users Handlers - Updated for Real Indexer Data
 * 
 * Handles user-related queries using real GraphQL subgraph data.
 * Updated to match actual deployed BSC testnet indexer schema.
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
				case 'feesEarned':
					return await handleUserFeesEarned(c, subgraphClient);
				case 'poolUserBalances':
					return await handleUserPoolBalances(c, subgraphClient);
				case 'history':
					return await handleUserHistory(c, subgraphClient);
				case 'lifetimeStats':
					return await handleUserLifetimeStats(c, subgraphClient);
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
	const userAddress = c.req.param('user_address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user liquidity positions from subgraph...', userAddress);
	
	const positionsRaw = await subgraphClient.getUserLiquidityPositions(userAddress);
	const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
	
	// Extract unique bin IDs from user bin liquidities
	const binIds: number[] = [];
	for (const position of positions) {
		for (const binLiquidity of (position?.userBinLiquidities || [])) {
			if (!binIds.includes(binLiquidity.binId)) {
				binIds.push(binLiquidity.binId);
			}
		}
	}

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
	const userAddress = c.req.param('user_address');
	const chain = c.req.param('chain');
	if (!chain || !['bsc', 'chapel'].includes(chain)) {
		return c.json({
			error: 'Valid chain is required',
			timestamp: new Date().toISOString()
		}, 400);
	}
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user pool IDs from subgraph...', userAddress);
	
	const positionsRaw = await subgraphClient.getUserLiquidityPositions(userAddress);
	const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
	
	// Extract unique pool IDs
	const poolIds = positions
		.map((position: any) => position?.lbPair?.id)
		.filter((poolId: string) => poolId)
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
	const userAddress = c.req.param('user_address');
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
	
	// Get user's swaps and mints/burns
	const [swapsRaw, mintsBurnsRaw] = await Promise.all([
		subgraphClient.getUserSwaps(userAddress, limit),
		subgraphClient.getUserMintsBurns(userAddress, limit)
	]);
	
	const swaps = Array.isArray(swapsRaw) ? swapsRaw : [];
	const mintsBurns = Array.isArray(mintsBurnsRaw) ? mintsBurnsRaw : [];
	
	// Combine and sort all transactions
	const allTransactions = [
		...swaps.map((swap: any) => ({
			...swap,
			type: 'swap',
			timestamp: parseInt(swap.timestamp || '0')
		})),
		...mintsBurns.map((tx: any) => ({
			...tx,
			timestamp: parseInt(tx.timestamp || '0')
		}))
	].sort((a, b) => b.timestamp - a.timestamp);
	
	// Apply pagination
	const paginatedTransactions = allTransactions.slice(offset, offset + limit);
	
	// Transform transaction data
	const transformedTransactions = paginatedTransactions.map((tx: any) => ({
		id: tx.id,
		type: tx.type || 'swap',
		timestamp: tx.timestamp,
		pool: {
			id: tx.lbPair?.id,
			name: tx.lbPair ? `${tx.lbPair.tokenX.symbol}/${tx.lbPair.tokenY.symbol}` : 'Unknown',
		},
		amounts: {
			tokenXIn: tx.amountXIn || '0',
			tokenYIn: tx.amountYIn || '0', 
			tokenXOut: tx.amountXOut || '0',
			tokenYOut: tx.amountYOut || '0',
			tokenX: tx.amountX || '0',
			tokenY: tx.amountY || '0',
			usd: tx.amountUSD || '0',
		},
		fees: {
			tokenX: tx.feesTokenX || '0',
			tokenY: tx.feesTokenY || '0',
			usd: tx.feesUSD || '0',
		},
		txHash: tx.transaction?.id,
		blockNumber: tx.transaction?.blockNumber,
		sender: tx.sender,
		recipient: tx.recipient,
	}));

	const pagination = {
		page,
		limit,
		total: allTransactions.length,
		hasNext: offset + limit < allTransactions.length,
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
	const userAddress = c.req.param('user_address');

	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user lifetime stats from subgraph...', userAddress);
	
	const [positionsRaw, transactionsRaw] = await Promise.all([
		subgraphClient.getUserPositions(userAddress),
		subgraphClient.getUserTransactions(userAddress, 1000, 0)
	]);

	const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
	const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : [];

	// Calculate lifetime stats
	const totalLiquidity = positions.reduce((sum: number, position: any) => 
		sum + parseFloat(position?.liquidityUSD || '0'), 0);

	const totalVolume = transactions
		.filter((tx: any) => tx?.type === 'swap')
		.reduce((sum: number, tx: any) => 
			sum + parseFloat(tx?.amountUSD || '0'), 0);

	const totalFees = transactions.reduce((sum: number, tx: any) => 
		sum + parseFloat(tx?.feeUSD || '0'), 0);

	const stats = {
		userAddress,
		totalLiquidityProvided: totalLiquidity.toString(),
		totalVolumeTraded: totalVolume.toString(),
		totalFeesEarned: totalFees.toString(),
		totalTransactions: transactions.length,
		totalPools: positions.length,
		firstTransactionDate: transactions.length > 0 ? 
			new Date(Math.min(...transactions.map((tx: any) => parseInt(tx?.timestamp) * 1000))).toISOString() : null,
		lastTransactionDate: transactions.length > 0 ? 
			new Date(Math.max(...transactions.map((tx: any) => parseInt(tx?.timestamp) * 1000))).toISOString() : null,
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
	const userAddress = c.req.param('user_address');

	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user fees earned from subgraph...', userAddress);
	
	const positionsRaw = await subgraphClient.getUserPositions(userAddress);
	const positions = Array.isArray(positionsRaw) ? positionsRaw : [];

	// Calculate fees earned per position
	const feesEarned = positions.map((position: any) => {
		const poolShare = parseFloat(position?.liquidity || '0') / parseFloat(position?.pool?.totalLiquidity || '1');
		const poolFeesUSD = parseFloat(position?.pool?.feesUSD || '0');
		const userFeesUSD = poolFeesUSD * poolShare;
		
		return {
			poolId: position?.pool?.id || '',
			poolName: position?.pool ? `${position.pool.tokenX.symbol}/${position.pool.tokenY.symbol}` : '',
			liquidityShare: poolShare,
			feesEarnedUSD: userFeesUSD.toString(),
			position: {
				binId: position?.binId,
				liquidity: position?.liquidity,
				liquidityUSD: position?.liquidityUSD,
			},
		};
	});

	const totalFeesEarned = feesEarned.reduce((sum: number, fee: any) => 
		sum + parseFloat(fee?.feesEarnedUSD || '0'), 0);

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
	const userAddress = c.req.query('lpAddress');
	const poolId = c.req.query('poolAddress');
	const chainId = c.req.query('chainId');
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid lp address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	if (!poolId) {
		return c.json({
			error: 'Pool ID is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user pool balances from subgraph...', chainId, userAddress, poolId);
	
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
