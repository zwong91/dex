/**
 * DEX API Routing Module
 * Centralized routing logic for all DEX endpoints
 */

import { handlePoolsList, handleTokensList, handleDexAnalytics, handlePoolsByChain, handlePoolDetails } from '../handlers/pools';
import { handleUserRewards, handleBatchRewardsProof, handleClaimableRewards, handleRewardsHistory } from '../handlers/rewards';
import { handleUserBinIds, handleUserPoolIds, handlePoolUserBalances, handleUserHistory, handleUserFeesEarned, handleUserLifetimeStats } from '../handlers/users';
import { handleUserFarms, handleUserFarmDetails } from '../handlers/farms';
import { 
  handleVaultsList, 
  handleVaultsByChain, 
  handleVaultSharePrice, 
  handleVaultDetails, 
  handleVaultTvlHistory, 
  handleVaultRecentActivity, 
  handleVaultWithdrawalsByUser, 
  handleVaultWithdrawalsByUserAndVault 
} from '../handlers/vaults';
import { 
  handleTriggerSync, 
  handleSyncStatus, 
  handlePoolDiscovery, 
  handleDatabaseStats 
} from '../handlers/sync';

/**
 * Route handler type definition
 */
export type RouteHandler = (request: Request, env: any) => Promise<Response>;

/**
 * Route configuration interface
 */
export interface RouteConfig {
  path: string;
  method: string;
  handler: RouteHandler;
  requiresAuth?: boolean;
  rateLimitTier?: 'basic' | 'premium' | 'enterprise';
}

/**
 * DEX API Routes Configuration
 */
export const DEX_ROUTES: RouteConfig[] = [
  // Pools and Analytics
  {
    path: '/api/dex/pools',
    method: 'GET',
    handler: handlePoolsList,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/tokens',
    method: 'GET',
    handler: handleTokensList,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/analytics',
    method: 'GET',
    handler: handleDexAnalytics,
    requiresAuth: true,
    rateLimitTier: 'premium'
  },
  {
    path: '/api/dex/pools/chain/:chainId',
    method: 'GET',
    handler: handlePoolsByChain,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/pools/:poolId',
    method: 'GET',
    handler: handlePoolDetails,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },

  // Rewards
  {
    path: '/api/dex/user/:userAddress/rewards',
    method: 'GET',
    handler: handleUserRewards,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/rewards/batch-proof',
    method: 'POST',
    handler: handleBatchRewardsProof,
    requiresAuth: true,
    rateLimitTier: 'premium'
  },
  {
    path: '/api/dex/user/:userAddress/claimable-rewards',
    method: 'GET',
    handler: handleClaimableRewards,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/rewards/history',
    method: 'GET',
    handler: handleRewardsHistory,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },

  // User Data
  {
    path: '/api/dex/user/:userAddress/bin-ids',
    method: 'GET',
    handler: handleUserBinIds,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/pool-ids',
    method: 'GET',
    handler: handleUserPoolIds,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/pool/:poolId/user/:userAddress/balances',
    method: 'GET',
    handler: handlePoolUserBalances,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/history',
    method: 'GET',
    handler: handleUserHistory,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/fees-earned',
    method: 'GET',
    handler: handleUserFeesEarned,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/lifetime-stats',
    method: 'GET',
    handler: handleUserLifetimeStats,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },

  // Farms
  {
    path: '/api/dex/user/:userAddress/farms',
    method: 'GET',
    handler: handleUserFarms,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/farms/:farmId',
    method: 'GET',
    handler: handleUserFarmDetails,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },

  // Vaults
  {
    path: '/api/dex/vaults',
    method: 'GET',
    handler: handleVaultsList,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/vaults/chain/:chainId',
    method: 'GET',
    handler: handleVaultsByChain,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/vault/:vaultId/share-price',
    method: 'GET',
    handler: handleVaultSharePrice,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/vault/:vaultId',
    method: 'GET',
    handler: handleVaultDetails,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/vault/:vaultId/tvl-history',
    method: 'GET',
    handler: handleVaultTvlHistory,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/vault/:vaultId/recent-activity',
    method: 'GET',
    handler: handleVaultRecentActivity,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/vault-withdrawals',
    method: 'GET',
    handler: handleVaultWithdrawalsByUser,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/user/:userAddress/vault/:vaultId/withdrawals',
    method: 'GET',
    handler: handleVaultWithdrawalsByUserAndVault,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },

  // Sync and System Management
  {
    path: '/api/dex/sync/trigger',
    method: 'POST',
    handler: handleTriggerSync,
    requiresAuth: true,
    rateLimitTier: 'enterprise'
  },
  {
    path: '/api/dex/sync/status',
    method: 'GET',
    handler: handleSyncStatus,
    requiresAuth: true,
    rateLimitTier: 'basic'
  },
  {
    path: '/api/dex/pools/discover',
    method: 'POST',
    handler: handlePoolDiscovery,
    requiresAuth: true,
    rateLimitTier: 'enterprise'
  },
  {
    path: '/api/dex/database/stats',
    method: 'GET',
    handler: handleDatabaseStats,
    requiresAuth: true,
    rateLimitTier: 'basic'
  }
];

/**
 * Route matcher utility
 */
export function matchRoute(pathname: string, method: string): RouteConfig | null {
  // Remove version prefix from pathname for matching
  // Support both /v1/api/dex and /api/v2/dex patterns
  let normalizedPath = pathname;
  
  // Remove /v1/ prefix if present
  if (normalizedPath.startsWith('/v1/')) {
    normalizedPath = normalizedPath.replace('/v1', '');
  }
  
  for (const route of DEX_ROUTES) {
    if (route.method !== method) continue;
    
    // Convert route path to regex pattern
    const pattern = route.path
      .replace(/:[^/]+/g, '([^/]+)')  // Replace :param with capture group
      .replace(/\//g, '\\/');        // Escape forward slashes
    
    const regex = new RegExp(`^${pattern}$`);
    
    if (regex.test(normalizedPath)) {
      return route;
    }
  }
  
  return null;
}

/**
 * Extract route parameters from pathname
 */
export function extractRouteParams(pathname: string, routePath: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  // Normalize pathname like in matchRoute
  let normalizedPath = pathname;
  if (normalizedPath.startsWith('/v1/')) {
    normalizedPath = normalizedPath.replace('/v1', '');
  }
  
  const routeParts = routePath.split('/');
  const pathParts = normalizedPath.split('/');
  
  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];
    
    if (routePart?.startsWith(':') && pathPart) {
      const paramName = routePart.slice(1); // Remove the ':'
      params[paramName] = pathPart;
    }
  }
  
  return params;
}

/**
 * Get rate limit configuration for a route
 */
export function getRateLimitConfig(tier: string = 'basic'): { limit: number; window: number } {
  const configs = {
    basic: { limit: 100, window: 3600 },      // 100 requests per hour
    premium: { limit: 1000, window: 3600 },   // 1000 requests per hour
    enterprise: { limit: 10000, window: 3600 } // 10000 requests per hour
  };
  
  return configs[tier as keyof typeof configs] || configs.basic;
}
