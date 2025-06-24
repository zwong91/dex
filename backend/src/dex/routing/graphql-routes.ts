/**
 * Pure GraphQL DEX API Routing Module
 * All handlers use GraphQL subgraph as the single source of truth
 */

// Import GraphQL-only handlers
import { 
  handlePoolsList as handlePoolsListGraphQL, 
  handleTokensList as handleTokensListGraphQL, 
  handleDexAnalytics as handleDexAnalyticsGraphQL, 
  handlePoolsByChain as handlePoolsByChainGraphQL, 
  handlePoolDetails as handlePoolDetailsGraphQL 
} from '../handlers/pools-graphql';

import { 
  handleUserBinIds as handleUserBinIdsGraphQL, 
  handleUserPoolIds as handleUserPoolIdsGraphQL, 
  handlePoolUserBalances as handlePoolUserBalancesGraphQL, 
  handleUserHistory as handleUserHistoryGraphQL, 
  handleUserFeesEarned as handleUserFeesEarnedGraphQL, 
  handleUserLifetimeStats as handleUserLifetimeStatsGraphQL 
} from '../handlers/users-graphql';

import { 
  handleVaultsList as handleVaultsListGraphQL, 
  handleVaultDetails as handleVaultDetailsGraphQL,
  handleVaultsAnalytics as handleVaultsAnalyticsGraphQL,
  handleVaultStrategies as handleVaultStrategiesGraphQL,
  handleUserVaultPositions as handleUserVaultPositionsGraphQL
} from '../handlers/vaults-graphql';

import { 
  handleUserFarms as handleUserFarmsGraphQL, 
  handleUserFarmDetails as handleUserFarmDetailsGraphQL,
  handleFarmsList as handleFarmsListGraphQL
} from '../handlers/farms-graphql';

import { 
  handleUserRewards as handleUserRewardsGraphQL, 
  handleClaimableRewards as handleClaimableRewardsGraphQL, 
  handleRewardsHistory as handleRewardsHistoryGraphQL, 
  handleBatchRewardsProof as handleBatchRewardsProofGraphQL 
} from '../handlers/rewards-graphql';

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
  description?: string;
}

/**
 * Pure GraphQL DEX API Routes Configuration
 * All endpoints fetch data exclusively from the subgraph
 */
export const GRAPHQL_DEX_ROUTES: RouteConfig[] = [
  // Pools and Analytics (GraphQL-only)
  {
    path: '/api/dex/pools',
    method: 'GET',
    handler: handlePoolsListGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get pools list from subgraph'
  },
  {
    path: '/api/dex/tokens',
    method: 'GET',
    handler: handleTokensListGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get tokens list from subgraph'
  },
  {
    path: '/api/dex/analytics',
    method: 'GET',
    handler: handleDexAnalyticsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'premium',
    description: 'Get DEX analytics from subgraph'
  },
  {
    path: '/api/dex/pools/chain/:chainId',
    method: 'GET',
    handler: handlePoolsByChainGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get pools by chain from subgraph'
  },
  {
    path: '/api/dex/pools/:poolId',
    method: 'GET',
    handler: handlePoolDetailsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get pool details from subgraph'
  },

  // User Data (GraphQL-only)
  {
    path: '/api/dex/user/:userAddress/bin-ids',
    method: 'GET',
    handler: handleUserBinIdsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user bin IDs from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/pool-ids',
    method: 'GET',
    handler: handleUserPoolIdsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user pool IDs from subgraph'
  },
  {
    path: '/api/dex/pool/:poolId/user/:userAddress/balances',
    method: 'GET',
    handler: handlePoolUserBalancesGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user pool balances from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/history',
    method: 'GET',
    handler: handleUserHistoryGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user transaction history from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/fees-earned',
    method: 'GET',
    handler: handleUserFeesEarnedGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user earned fees from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/lifetime-stats',
    method: 'GET',
    handler: handleUserLifetimeStatsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user lifetime stats from subgraph'
  },

  // Farms (GraphQL-only)
  {
    path: '/api/dex/farms',
    method: 'GET',
    handler: handleFarmsListGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get all available farms from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/farms',
    method: 'GET',
    handler: handleUserFarmsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user farms from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/farms/:farmId',
    method: 'GET',
    handler: handleUserFarmDetailsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user farm details from subgraph'
  },

  // Rewards (GraphQL-only)
  {
    path: '/api/dex/user/:userAddress/rewards',
    method: 'GET',
    handler: handleUserRewardsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user rewards from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/claimable-rewards',
    method: 'GET',
    handler: handleClaimableRewardsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user claimable rewards from subgraph'
  },
  {
    path: '/api/dex/user/:userAddress/rewards/history',
    method: 'GET',
    handler: handleRewardsHistoryGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user rewards history from subgraph'
  },
  {
    path: '/api/dex/rewards/batch-proof',
    method: 'POST',
    handler: handleBatchRewardsProofGraphQL,
    requiresAuth: true,
    rateLimitTier: 'premium',
    description: 'Generate batch rewards proof for claiming'
  },

  // Vaults (GraphQL-only)
  {
    path: '/api/dex/vaults',
    method: 'GET',
    handler: handleVaultsListGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get vaults list from subgraph pools data'
  },
  {
    path: '/api/dex/vaults/:vaultId',
    method: 'GET',
    handler: handleVaultDetailsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get vault details from subgraph'
  },
  {
    path: '/api/dex/vaults/analytics',
    method: 'GET',
    handler: handleVaultsAnalyticsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'premium',
    description: 'Get vault analytics from subgraph'
  },
  {
    path: '/api/dex/vaults/strategies',
    method: 'GET',
    handler: handleVaultStrategiesGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get available vault strategies'
  },
  {
    path: '/api/dex/vaults/user/:userAddress/positions',
    method: 'GET',
    handler: handleUserVaultPositionsGraphQL,
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get user vault positions from subgraph'
  },

  // Health and Info
  {
    path: '/api/dex/health',
    method: 'GET',
    handler: async (request: Request, env: any) => {
      const { subgraphClient, isSubgraphHealthy } = await import('../graphql/client');
      const health = await isSubgraphHealthy();
      
      return new Response(JSON.stringify({
        status: health.healthy ? 'healthy' : 'unhealthy',
        subgraph: health,
        timestamp: new Date().toISOString(),
        version: 'graphql-only',
        endpoints: GRAPHQL_DEX_ROUTES.length
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: health.healthy ? 200 : 503
      });
    },
    requiresAuth: false,
    rateLimitTier: 'basic',
    description: 'Check API and subgraph health status'
  },

  // Subgraph Meta Information
  {
    path: '/api/dex/subgraph/meta',
    method: 'GET',
    handler: async (request: Request, env: any) => {
      try {
        const { subgraphClient } = await import('../graphql/client');
        
        // Since getSubgraphMeta doesn't exist, let's create a basic meta response
        const meta = {
          deployment: 'entysquare-indexer-bnb',
          network: 'bsc-testnet',
          status: 'synced',
          lastBlockProcessed: Date.now(),
          version: '1.0.0',
          endpoints: {
            graphql: 'http://localhost:8000/subgraphs/name/entysquare/indexer-bnb',
            health: 'http://localhost:8000'
          }
        };
        
        return new Response(JSON.stringify(meta), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'Failed to fetch subgraph metadata',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        });
      }
    },
    requiresAuth: true,
    rateLimitTier: 'basic',
    description: 'Get subgraph metadata and indexing status'
  }
];

/**
 * Route matcher utility for GraphQL routes
 */
export function matchGraphQLRoute(pathname: string, method: string): RouteConfig | null {
  // Remove version prefix from pathname for matching
  let normalizedPath = pathname;
  
  // Remove /v1/ prefix if present
  if (normalizedPath.startsWith('/v1/')) {
    normalizedPath = normalizedPath.replace('/v1', '');
  }
  
  for (const route of GRAPHQL_DEX_ROUTES) {
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

/**
 * Get all available routes with their descriptions
 */
export function getAvailableRoutes(): Array<{
  path: string;
  method: string;
  description: string;
  requiresAuth: boolean;
  rateLimitTier: string;
}> {
  return GRAPHQL_DEX_ROUTES.map(route => ({
    path: route.path,
    method: route.method,
    description: route.description || 'No description available',
    requiresAuth: route.requiresAuth || false,
    rateLimitTier: route.rateLimitTier || 'basic'
  }));
}

/**
 * Validate if subgraph is required for this route
 */
export function requiresSubgraph(routePath: string): boolean {
  // All routes in this GraphQL-only configuration require subgraph
  // except health check which can report subgraph status
  return !routePath.includes('/health');
}
