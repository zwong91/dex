/**
 * DEX Rewards Handlers - Pure GraphQL Implementation with Hono
 * Rewards are calculated from user positions and pool performance
 */

import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

/**
 * Create rewards handler factory
 */
export function createRewardsHandler(action: string) {
	return async function rewardsHandler(c: Context<{ Bindings: Env }>) {
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
				case 'userRewards':
					return await handleUserRewards(c, subgraphClient);
				case 'claimableRewards':
					return await handleClaimableRewards(c, subgraphClient);
				case 'rewardsHistory':
					return await handleRewardsHistory(c, subgraphClient);
				case 'batchProof':
					return await handleBatchProof(c, subgraphClient);
				default:
					return c.json({
						error: 'Invalid action',
						timestamp: new Date().toISOString()
					}, 400);
			}

		} catch (error) {
			console.error('Rewards handler error:', error);
			return c.json({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	};
}

/**
 * Get user's overall rewards summary
 */
async function handleUserRewards(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching user rewards from subgraph...', userAddress);
	
	const [userPositionsRaw, userTransactionsRaw, poolsDayData] = await Promise.all([
		subgraphClient.getUserPositions(userAddress),
		subgraphClient.getUserTransactions(userAddress, 1000, 0),
		subgraphClient.getPoolsDayData(1000, 1) // Get 24h data for reward calculations
	]);

	const userPositions = Array.isArray(userPositionsRaw) ? userPositionsRaw : [];
	const userTransactions = Array.isArray(userTransactionsRaw) ? userTransactionsRaw : [];
	
	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});

	// Calculate rewards from each position with real 24h data
	const positionRewards = userPositions.map((position: any) => {
		const poolDayData = poolDayDataMap.get(position.pool.id);
		const rewards = calculatePositionRewards(position, poolDayData);
		return {
			poolId: position.pool.id,
			poolName: `${position.pool.tokenX.symbol}/${position.pool.tokenY.symbol}`,
			position: {
				binId: position.binId,
				liquidity: position.liquidity,
				liquidityUSD: position.liquidityUSD,
			},
			rewards,
		};
	});

	// Calculate total rewards
	const totalEarned = positionRewards.reduce((sum: number, pr: any) => 
		sum + parseFloat(pr.rewards.totalEarned), 0);
	
	const totalClaimable = positionRewards.reduce((sum: number, pr: any) => 
		sum + parseFloat(pr.rewards.claimable), 0);
	
	const totalPending = positionRewards.reduce((sum: number, pr: any) => 
		sum + parseFloat(pr.rewards.pending), 0);

	// Get fee rewards from transaction history
	const feeRewards = calculateFeeRewards(userTransactions);

	const userRewards = {
		userAddress,
		totalRewards: (totalEarned + feeRewards.totalFees).toString(),
		claimableRewards: totalClaimable.toString(),
		pendingRewards: totalPending.toString(),
		feeRewards: feeRewards.totalFees.toString(),
		breakdown: {
			liquidityMining: totalEarned.toString(),
			tradingFees: feeRewards.totalFees.toString(),
			referralBonus: '0', // Not implemented yet
			stakingRewards: '0', // Not implemented yet
		},
		rewardsByPool: positionRewards,
		rewardsHistory: generateRewardsHistory(positionRewards, feeRewards),
		lastUpdate: new Date().toISOString(),
	};

	return c.json({
		success: true,
		data: userRewards,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user's claimable rewards
 */
async function handleClaimableRewards(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching claimable rewards from subgraph...', userAddress);
	
	const [userPositions, poolsDayData] = await Promise.all([
		subgraphClient.getUserPositions(userAddress),
		subgraphClient.getPoolsDayData(1000, 1) // Get 24h data for reward calculations
	]);
	
	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});

	// Calculate claimable rewards for each position with real 24h data
	const claimableByPool = userPositions.map((position: any) => {
		const poolDayData = poolDayDataMap.get(position.pool.id);
		const rewards = calculatePositionRewards(position, poolDayData);
		return {
			poolId: position.pool.id,
			poolName: `${position.pool.tokenX.symbol}/${position.pool.tokenY.symbol}`,
			tokens: [
				{
					address: position.pool.tokenX.id,
					symbol: position.pool.tokenX.symbol,
					amount: (parseFloat(rewards.claimable) * 0.5).toFixed(6), // Split between tokens
					amountUSD: (parseFloat(rewards.claimableUSD) * 0.5).toFixed(2),
				},
				{
					address: position.pool.tokenY.id,
					symbol: position.pool.tokenY.symbol,
					amount: (parseFloat(rewards.claimable) * 0.5).toFixed(6),
					amountUSD: (parseFloat(rewards.claimableUSD) * 0.5).toFixed(2),
				},
			],
			totalClaimableUSD: rewards.claimableUSD,
		};
	});

	const totalClaimableUSD = claimableByPool.reduce((sum: number, pool: any) => 
		sum + parseFloat(pool.totalClaimableUSD), 0);

	return c.json({
		success: true,
		data: {
			userAddress,
			totalClaimableUSD: totalClaimableUSD.toString(),
			claimableByPool,
			claimCount: claimableByPool.length,
			estimatedGasCost: '0.01', // Mock gas estimate
		},
		timestamp: new Date().toISOString()
	});
}

/**
 * Get user's rewards history
 */
async function handleRewardsHistory(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const userAddress = c.req.param('address');
	const page = parseInt(c.req.query('page') || '1');
	const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Fetching rewards history from subgraph...', userAddress);
	
	const offset = (page - 1) * limit;
	const transactions = await subgraphClient.getUserTransactions(userAddress, limit, offset);

	// Generate rewards history from transactions
	const rewardsHistory = transactions
		.filter((tx: any) => tx.type !== 'swap') // Only LP-related transactions
		.map((tx: any) => ({
			id: tx.id,
			type: getRewardType(tx),
			timestamp: parseInt(tx.timestamp) * 1000,
			pool: {
				id: tx.pool?.id,
				name: tx.pool ? `${tx.pool.tokenX.symbol}/${tx.pool.tokenY.symbol}` : 'Unknown',
			},
			reward: {
				amount: calculateTxReward(tx),
				amountUSD: (parseFloat(calculateTxReward(tx)) * 1.5).toFixed(2), // Mock USD conversion
				token: tx.pool?.tokenX?.symbol || 'UNKNOWN',
			},
			status: 'earned',
			txHash: tx.transaction?.id,
		}));

	const pagination = {
		page,
		limit,
		total: rewardsHistory.length,
		hasNext: rewardsHistory.length === limit,
		hasPrev: page > 1,
	};

	return c.json({
		success: true,
		data: {
			userAddress,
			rewardsHistory,
		},
		pagination,
		timestamp: new Date().toISOString()
	});
}

/**
 * Generate batch proof for claiming multiple rewards
 */
async function handleBatchProof(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const { userAddress, poolIds } = await c.req.json();
	
	if (!userAddress || !isValidAddress(userAddress)) {
		return c.json({
			error: 'Valid user address is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	if (!poolIds || !Array.isArray(poolIds) || poolIds.length === 0) {
		return c.json({
			error: 'Pool IDs array is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	console.log('🔗 Generating batch proof for rewards claim...', userAddress, poolIds);
	
	// Get user positions and pool day data for specified pools
	const [userPositions, poolsDayData] = await Promise.all([
		subgraphClient.getUserPositions(userAddress),
		subgraphClient.getPoolsDayData(1000, 1) // Get 24h data for accurate rewards
	]);
	
	const relevantPositions = userPositions.filter((pos: any) => 
		poolIds.includes(pos.pool.id)
	);
	
	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});

	if (relevantPositions.length === 0) {
		return c.json({
			error: 'No eligible positions found for the specified pools',
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Generate merkle proofs for batch claiming with real 24h data
	const proofs = relevantPositions.map((position: any) => {
		const poolDayData = poolDayDataMap.get(position.pool.id);
		const rewards = calculatePositionRewards(position, poolDayData);
		return {
			poolId: position.pool.id,
			userAddress,
			amount: rewards.claimable,
			proof: generateMockMerkleProof(userAddress, position.pool.id, rewards.claimable),
		};
	});

	const totalAmount = proofs.reduce((sum: number, proof: any) => 
		sum + parseFloat(proof.amount), 0);

	return c.json({
		success: true,
		data: {
			userAddress,
			batchProof: {
				merkleRoot: generateMockMerkleRoot(),
				totalAmount: totalAmount.toString(),
				proofs,
				validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
				nonce: Date.now().toString(),
			},
		},
		timestamp: new Date().toISOString()
	});
}

// Helper functions
function calculatePositionRewards(position: any, poolDayData?: any) {
	const liquidityUSD = parseFloat(position.liquidityUSD || '0');
	const poolTvl = parseFloat(position.pool?.totalValueLockedUSD || '1');
	
	// Use real 24h fees from pool day data if available
	let dailyFees = 0;
	if (poolDayData) {
		dailyFees = parseFloat(poolDayData.feesUSD || '0');
	} else {
		// Fallback: estimate from lifetime fees
		const poolFeesLifetime = parseFloat(position.pool?.feesUSD || '0');
		dailyFees = poolFeesLifetime / 30; // Rough estimate over 30 days
	}
	
	// Calculate user's share of pool
	const userShare = poolTvl > 0 ? liquidityUSD / poolTvl : 0;
	
	// Calculate rewards based on real 24h fees
	const dailyFeeShare = dailyFees * userShare;
	const estimatedDaysActive = 30; // Mock 30 days for total earned
	
	const totalEarned = dailyFeeShare * estimatedDaysActive;
	const claimable = totalEarned * 0.7; // 70% claimable
	const pending = totalEarned * 0.3; // 30% pending
	
	// Calculate APY based on real daily fees
	const dailyAPR = liquidityUSD > 0 ? (dailyFeeShare / liquidityUSD) * 100 : 0;
	const apy = dailyAPR * 365;
	
	return {
		totalEarned: totalEarned.toFixed(6),
		claimable: claimable.toFixed(6),
		claimableUSD: (claimable * 1.5).toFixed(2), // Mock USD conversion
		pending: pending.toFixed(6),
		pendingUSD: (pending * 1.5).toFixed(2),
		dailyRate: dailyFeeShare.toFixed(6),
		apy: apy.toFixed(2),
	};
}

function calculateFeeRewards(transactions: any[]) {
	const feeTransactions = transactions.filter(tx => 
		tx.type === 'swap' && parseFloat(tx.fee || '0') > 0
	);
	
	const totalFees = feeTransactions.reduce((sum: number, tx: any) => 
		sum + parseFloat(tx.feeUSD || '0'), 0);
	
	return {
		totalFees,
		transactionCount: feeTransactions.length,
		averageFee: feeTransactions.length > 0 ? totalFees / feeTransactions.length : 0,
	};
}

function generateRewardsHistory(positionRewards: any[], feeRewards: any) {
	// Generate mock historical data
	const history = [];
	const now = Date.now();
	
	// Add position rewards over time
	for (let i = 0; i < 30; i++) {
		const date = new Date(now - i * 24 * 60 * 60 * 1000);
		const dailyReward = positionRewards.reduce((sum: number, pr: any) => 
			sum + parseFloat(pr.rewards.dailyRate || '0'), 0);
		
		if (dailyReward > 0) {
			history.push({
				date: date.toISOString().split('T')[0],
				type: 'liquidity_mining',
				amount: dailyReward.toFixed(6),
				amountUSD: (dailyReward * 1.5).toFixed(2),
			});
		}
	}
	
	return history.slice(0, 7); // Return last 7 days
}

function getRewardType(tx: any): string {
	if (tx.type === 'add_liquidity') return 'liquidity_mining';
	if (tx.type === 'remove_liquidity') return 'harvest';
	if (tx.type === 'swap') return 'trading_fee';
	return 'other';
}

function calculateTxReward(tx: any): string {
	const feeUSD = parseFloat(tx.feeUSD || '0');
	// Mock reward calculation: 10% of fees as rewards
	return (feeUSD * 0.1).toFixed(6);
}

function generateMockMerkleProof(userAddress: string, poolId: string, amount: string): string[] {
	// Generate mock merkle proof using TextEncoder for Cloudflare Workers compatibility
	const encoder = new TextEncoder();
	
	const hash1 = `0x${Array.from(encoder.encode(`${userAddress}${poolId}${amount}`))
		.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64)}`;
	const hash2 = `0x${Array.from(encoder.encode(`proof2_${userAddress}`))
		.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64)}`;
	const hash3 = `0x${Array.from(encoder.encode(`proof3_${poolId}`))
		.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64)}`;
	
	return [hash1, hash2, hash3];
}

function generateMockMerkleRoot(): string {
	const encoder = new TextEncoder();
	return `0x${Array.from(encoder.encode(`merkle_root_${Date.now()}`))
		.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64)}`;
}

function isValidAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Export functions for GraphQL route handlers
export { handleUserRewards, handleClaimableRewards, handleRewardsHistory, handleBatchProof };
