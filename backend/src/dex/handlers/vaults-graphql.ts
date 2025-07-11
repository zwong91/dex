/**
 * DEX Vaults Handlers - Updated for Real Indexer Data
 * 
 * Vaults are derived from high-TVL pools with automated strategies.
 * Since indexer doesn't have dedicated vault entities, we create them from pools.
 */

import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

/**
 * Create vaults handler factory
 */
export function createVaultsHandler(action: string) {
	return async function vaultsHandler(c: Context<{ Bindings: Env }>) {
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
					return await handleVaultsList(c, subgraphClient);
				case 'details':
					return await handleVaultDetails(c, subgraphClient);
				case 'analytics':
					return await handleVaultsAnalytics(c, subgraphClient);
				case 'strategies':
					return await handleVaultStrategies(c, subgraphClient);
				default:
					return c.json({
						error: 'Invalid action',
						timestamp: new Date().toISOString()
					}, 400);
			}

		} catch (error) {
			console.error('Vaults handler error:', error);
			return c.json({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	};
}

/**
 * Get list of all vaults (derived from high-TVL pools)
 */
async function handleVaultsList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const page = parseInt(c.req.query('page') || '1');
	const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
	const minTvl = parseFloat(c.req.query('minTvl') || '10000'); // Minimum TVL for vault eligibility
	
	console.log('🔗 Fetching vault-eligible pools from subgraph...');
	
	// Get pools sorted by TVL to identify vault candidates
	const pools = await subgraphClient.getPools(1000, 0, 'totalValueLockedUSD', 'desc');
	
	// Filter pools that qualify as vaults (high TVL, active)
	const vaultEligiblePools = pools.filter((pool: any) => 
		parseFloat(pool.totalValueLockedUSD || '0') >= minTvl &&
		parseInt(pool.liquidityProviderCount || '0') > 0
	);

	// Transform pools to vault format
	const vaults = vaultEligiblePools.slice((page - 1) * limit, page * limit).map((pool: any) => 
		transformPoolToVault(pool, undefined, false)
	);

	const pagination = {
		page,
		limit,
		total: vaultEligiblePools.length,
		totalPages: Math.ceil(vaultEligiblePools.length / limit),
		hasNext: page * limit < vaultEligiblePools.length,
		hasPrev: page > 1,
	};

	return c.json({
		success: true,
		data: vaults,
		pagination,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get vault details by ID
 */
async function handleVaultDetails(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const vaultId = c.req.param('vaultId');
	
	if (!vaultId) {
		return c.json({
			error: 'Vault ID is required',
			timestamp: new Date().toISOString()
		}, 400);
	}

	// Extract pool ID from vault ID (format: vault_<poolId>)
	const poolId = vaultId.replace('vault_', '');
	
	console.log('🔗 Fetching vault details from subgraph...', poolId);
	
	const pool = await subgraphClient.getPoolById(poolId);
	
	if (!pool) {
		return c.json({
			error: 'Vault not found',
			vaultId,
			timestamp: new Date().toISOString()
		}, 404);
	}

	// Transform to vault with detailed information
	const vault = transformPoolToVault(pool, undefined, true);

	return c.json({
		success: true,
		data: vault,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get vaults analytics
 */
async function handleVaultsAnalytics(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	console.log('🔗 Fetching vaults analytics from subgraph...');
	
	const [pools, poolsDayData] = await Promise.all([
		subgraphClient.getPools(1000, 0, 'totalValueLockedUSD', 'desc'),
		subgraphClient.getPoolsDayData(1000, 1) // Get 24h data
	]);
	
	// Create a map of pool day data for quick lookup
	const poolDayDataMap = new Map();
	poolsDayData.forEach((dayData: any) => {
		const poolId = dayData.lbPair.id;
		if (!poolDayDataMap.has(poolId)) {
			poolDayDataMap.set(poolId, dayData);
		}
	});
	
	// Filter vault-eligible pools with real activity
	const vaultPools = pools.filter((pool: any) => {
		const tvl = parseFloat(pool.totalValueLockedUSD || '0');
		const liquidityProviders = parseInt(pool.liquidityProviderCount || '0');
		const dayData = poolDayDataMap.get(pool.id);
		const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;
		
		return tvl >= 10000 && liquidityProviders > 0 && volume24h > 500; // Real activity requirement
	});

	// Calculate analytics using real 24h data
	const totalTvl = vaultPools.reduce((sum: number, pool: any) => 
		sum + parseFloat(pool.totalValueLockedUSD || '0'), 0);
	
	const totalVolume24h = poolsDayData.reduce((sum: number, dayData: any) => 
		sum + parseFloat(dayData.volumeUSD || '0'), 0);
	
	const totalFees24h = poolsDayData.reduce((sum: number, dayData: any) => 
		sum + parseFloat(dayData.feesUSD || '0'), 0);

	const averageAPY = vaultPools.length > 0 ? 
		vaultPools.reduce((sum: number, pool: any) => {
			const dayData = poolDayDataMap.get(pool.id);
			return sum + calculatePoolAPY(pool, dayData);
		}, 0) / vaultPools.length : 0;

	// Top performing vaults with real 24h data
	const topVaults = vaultPools
		.map((pool: any) => {
			const dayData = poolDayDataMap.get(pool.id);
			return { 
				...transformPoolToVault(pool, dayData), 
				apy: calculatePoolAPY(pool, dayData) 
			};
		})
		.sort((a: { apy: number }, b: { apy: number }) => b.apy - a.apy)
		.slice(0, 10);

	const analytics = {
		totalVaults: vaultPools.length,
		totalTvl: totalTvl.toString(),
		totalVolume24h: totalVolume24h.toString(),
		totalFees24h: totalFees24h.toString(),
		averageAPY: averageAPY,
		topVaults,
		riskDistribution: {
			low: vaultPools.filter((pool: any) => calculateRiskLevel(pool) === 'low').length,
			medium: vaultPools.filter((pool: any) => calculateRiskLevel(pool) === 'medium').length,
			high: vaultPools.filter((pool: any) => calculateRiskLevel(pool) === 'high').length,
		},
		strategyDistribution: {
			conservative: vaultPools.filter((pool: any) => getVaultStrategy(pool) === 'conservative').length,
			balanced: vaultPools.filter((pool: any) => getVaultStrategy(pool) === 'balanced').length,
			aggressive: vaultPools.filter((pool: any) => getVaultStrategy(pool) === 'aggressive').length,
		},
	};

	return c.json({
		success: true,
		data: analytics,
		timestamp: new Date().toISOString()
	});
}

/**
 * Get available vault strategies
 */
async function handleVaultStrategies(c: Context<{ Bindings: Env }>, subgraphClient: any) {
	const strategies = [
		{
			id: 'conservative',
			name: 'Conservative Yield',
			description: 'Low-risk, stable returns through blue-chip token pairs',
			riskLevel: 'low',
			expectedAPY: '5-15%',
			features: ['Stable coin pairs', 'Low volatility', 'Automated rebalancing'],
			minTvl: 50000,
		},
		{
			id: 'balanced',
			name: 'Balanced Growth',
			description: 'Medium-risk strategy balancing yield and growth potential',
			riskLevel: 'medium',
			expectedAPY: '15-35%',
			features: ['Mixed token pairs', 'Moderate volatility', 'Dynamic fee optimization'],
			minTvl: 25000,
		},
		{
			id: 'aggressive',
			name: 'High Yield',
			description: 'High-risk, high-reward strategy with emerging token pairs',
			riskLevel: 'high',
			expectedAPY: '35-100%',
			features: ['New token pairs', 'High volatility', 'Maximum yield focus'],
			minTvl: 10000,
		},
	];

	return c.json({
		success: true,
		data: strategies,
		count: strategies.length,
		timestamp: new Date().toISOString()
	});
}

// Helper functions
function transformPoolToVault(pool: any, dayData?: any, detailed: boolean = false) {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	const apy = calculatePoolAPY(pool, dayData);
	const riskLevel = calculateRiskLevel(pool);
	const strategy = getVaultStrategy(pool);
	
	const baseVault = {
		vaultId: `vault_${pool.id}`,
		vaultAddress: pool.id,
		name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Auto-Compound Vault`,
		description: `Automated liquidity management for ${pool.tokenX.symbol}/${pool.tokenY.symbol} pair`,
		chain: 'bsc-testnet',
		poolAddress: pool.id,
		strategy,
		riskLevel,
		tokenX: {
			address: pool.tokenX.id,
			symbol: pool.tokenX.symbol,
			name: pool.tokenX.name,
			decimals: pool.tokenX.decimals,
			priceUsd: parseFloat(pool.tokenX.priceUSD || '0'),
		},
		tokenY: {
			address: pool.tokenY.id,
			symbol: pool.tokenY.symbol,
			name: pool.tokenY.name,
			decimals: pool.tokenY.decimals,
			priceUsd: parseFloat(pool.tokenY.priceUSD || '0'),
		},
		tvl: tvl.toString(),
		apy: apy,
		totalShares: pool.totalSupply || '0',
		sharePrice: '1.0', // Simplified for now
		managementFee: getManagementFee(strategy),
		performanceFee: getPerformanceFee(strategy),
		status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
		createdAt: pool.createdAtTimestamp ? 
			new Date(parseInt(pool.createdAtTimestamp) * 1000).toISOString() : new Date().toISOString(),
		lastUpdate: pool.updatedAtTimestamp ? parseInt(pool.updatedAtTimestamp) : Date.now(),
	};

	if (detailed) {
		const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : parseFloat(pool.volumeUSD || '0');
		const fees24h = dayData ? parseFloat(dayData.feesUSD || '0') : parseFloat(pool.feesUSD || '0');
		
		return {
			...baseVault,
			// Additional detailed information with real 24h data
			totalUsers: parseInt(pool.liquidityProviderCount || '0'),
			volume24h,
			fees24h,
			reserveX: parseFloat(pool.reserveX || '0'),
			reserveY: parseFloat(pool.reserveY || '0'),
			binStep: parseInt(pool.binStep || '0'),
			activeBins: pool.bins ? pool.bins.filter((bin: any) => parseFloat(bin.liquidity || '0') > 0).length : 0,
			performance: {
				dailyReturn: (apy / 365).toFixed(4),
				weeklyReturn: (apy / 52).toFixed(4),
				monthlyReturn: (apy / 12).toFixed(4),
			},
		};
	}

	return baseVault;
}

function calculatePoolAPY(pool: any, dayData?: any): number {
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	
	if (tvl === 0) return 0;
	
	// Use real 24h fees from day data if available
	let dailyFees = 0;
	if (dayData) {
		dailyFees = parseFloat(dayData.feesUSD || '0');
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

function calculateRiskLevel(pool: any): 'low' | 'medium' | 'high' {
	// TODO: Get real 24h volume from pool day data
	const volumeLifetime = parseFloat(pool.volumeUSD || '0');
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	
	if (tvl === 0) return 'high';
	
	// Rough estimate: assume lifetime volume over 30 days
	const volumeToTvlRatio = (volumeLifetime / 30) / tvl;
	
	// Simple risk assessment based on daily volume/TVL ratio estimate
	if (volumeToTvlRatio < 0.1) return 'low';
	if (volumeToTvlRatio < 0.5) return 'medium';
	return 'high';
}

function getVaultStrategy(pool: any): 'conservative' | 'balanced' | 'aggressive' {
	const riskLevel = calculateRiskLevel(pool);
	const tvl = parseFloat(pool.totalValueLockedUSD || '0');
	
	// Strategy based on risk and TVL
	if (riskLevel === 'low' && tvl > 50000) return 'conservative';
	if (riskLevel === 'medium' || (riskLevel === 'low' && tvl > 25000)) return 'balanced';
	return 'aggressive';
}

function getManagementFee(strategy: string): number {
	switch (strategy) {
		case 'conservative': return 0.5; // 0.5% annual management fee
		case 'balanced': return 1.0; // 1.0% annual management fee
		case 'aggressive': return 1.5; // 1.5% annual management fee
		default: return 1.0;
	}
}

function getPerformanceFee(strategy: string): number {
	switch (strategy) {
		case 'conservative': return 10; // 10% performance fee
		case 'balanced': return 15; // 15% performance fee
		case 'aggressive': return 20; // 20% performance fee
		default: return 15;
	}
}
