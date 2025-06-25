/**
 * GraphQL Client for Subgraph Integration
 * 
 * This module provides a GraphQL client to query data from the deployed subgraph.
 * It acts as a bridge between the REST API endpoints and the GraphQL subgraph.
 * 
 * Updated to match actual deployed BSC testnet indexer schema
 */

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

export interface SubgraphMeta {
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  deployment: string;
  hasIndexingErrors: boolean;
}

export interface LBPair {
  id: string;
  name: string;
  tokenX: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  tokenY: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  reserveX: string;
  reserveY: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  txCount: string;
  binStep: string;
  activeId: number;
  tokenXPrice: string;
  tokenYPrice: string;
  tokenXPriceUSD: string;
  tokenYPriceUSD: string;
  feesUSD: string;
  liquidityProviderCount: string;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
  volume: string;
  volumeUSD: string;
  totalValueLocked: string;
  totalValueLockedUSD: string;
  derivedAVAX: string;
  txCount: string;
  feesUSD: string;
  totalSupply: string;
}

export interface SwapEvent {
  id: string;
  transaction: {
    id: string;
    timestamp: string;
    blockNumber: string;
  };
  lbPair: {
    id: string;
    name: string;
    tokenX: {
      symbol: string;
      decimals: string;
    };
    tokenY: {
      symbol: string;
      decimals: string;
    };
  };
  sender: string;
  recipient: string;
  origin: string;
  activeId: number;
  amountXIn: string;
  amountYIn: string;
  amountXOut: string;
  amountYOut: string;
  amountUSD: string;
  feesTokenX: string;
  feesTokenY: string;
  feesUSD: string;
  timestamp: string;
}

/**
 * GraphQL Client for querying the subgraph
 */
export class SubgraphClient {
  private endpoint: string;
  
  constructor(endpoint?: string, env?: any) {
    // Use provided endpoint or get from environment or use default
    this.endpoint = endpoint || 
      env?.SUBGRAPH_URL ||
      'http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet';
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(query: string, variables?: Record<string, any>): Promise<GraphQLResponse<T>> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: variables || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: GraphQLResponse<T> = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        console.error('GraphQL errors:', result.errors);
      }

      return result;
    } catch (error) {
      console.error('GraphQL request failed:', error);
      throw error;
    }
  }

  /**
   * Get subgraph metadata and sync status
   */
  async getMeta(): Promise<SubgraphMeta | null> {
    const query = `
      query GetMeta {
        _meta {
          block {
            number
            hash
            timestamp
          }
          deployment
          hasIndexingErrors
        }
      }
    `;

    const result = await this.query<{ _meta: SubgraphMeta }>(query);
    return result.data?._meta || null;
  }

  /**
   * Check subgraph health and availability
   */
  async checkHealth(): Promise<{ healthy: boolean; blockNumber?: number; hasIndexingErrors?: boolean; error?: string }> {
    try {
      const meta = await this.getMeta();
      if (!meta) {
        return { healthy: false, error: 'No metadata available' };
      }

      if (meta.hasIndexingErrors) {
        return { 
          healthy: false, 
          error: 'Subgraph has indexing errors',
          hasIndexingErrors: true,
          blockNumber: meta.block.number
        };
      }

      // Check if the subgraph is reasonably up to date (within last 24 hours)
      const currentTime = Date.now() / 1000;
      const timeDiff = currentTime - meta.block.timestamp;
      
      // Be more lenient with timestamp check for development/testnet
      if (timeDiff > 86400) { // More than 24 hours behind
        console.warn(`Subgraph is ${Math.floor(timeDiff / 60)} minutes behind, but continuing...`);
      }

      return { 
        healthy: true, 
        blockNumber: meta.block.number,
        hasIndexingErrors: false
      };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all pools with basic information
   */
  async getPools(
    first: number = 100, 
    skip: number = 0,
    orderBy: string = 'totalValueLockedUSD',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<LBPair[]> {
    const query = `
      query GetPools($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        lbpairs(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
        ) {
          id
          name
          tokenX {
            id
            symbol
            name
            decimals
          }
          tokenY {
            id
            symbol
            name
            decimals
          }
          reserveX
          reserveY
          totalValueLockedUSD
          volumeUSD
          txCount
          binStep
          activeId
          tokenXPrice
          tokenYPrice
          tokenXPriceUSD
          tokenYPriceUSD
          feesUSD
          liquidityProviderCount
        }
      }
    `;

    const variables = {
      first,
      skip,
      orderBy,
      orderDirection,
    };

    const result = await this.query<{ lbpairs: LBPair[] }>(query, variables);
    return result.data?.lbpairs || [];
  }

  /**
   * Get a specific pool by address
   */
  async getPool(pairAddress: string): Promise<LBPair | null> {
    const query = `
      query GetPool($pairAddress: String!) {
        lbpairs(where: { id: $pairAddress }) {
          id
          name
          tokenX {
            id
            symbol
            name
            decimals
          }
          tokenY {
            id
            symbol
            name
            decimals
          }
          reserveX
          reserveY
          totalValueLockedUSD
          volumeUSD
          txCount
          binStep
          activeId
          tokenXPrice
          tokenYPrice
          tokenXPriceUSD
          tokenYPriceUSD
          feesUSD
          liquidityProviderCount
        }
      }
    `;

    const result = await this.query<{ lbpairs: LBPair[] }>(query, { pairAddress: pairAddress.toLowerCase() });
    return result.data?.lbpairs?.[0] || null;
  }

  /**
   * Get user's swap history
   */
  async getUserSwaps(userAddress: string, first: number = 100): Promise<any[]> {
    const query = `
      query GetUserSwaps($userAddress: String!, $first: Int!) {
        swaps(
          where: { 
            or: [
              { sender: $userAddress },
              { recipient: $userAddress }
            ]
          }
          first: $first
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
            blockNumber
          }
          lbPair {
            id
            name
            tokenX {
              symbol
              decimals
            }
            tokenY {
              symbol
              decimals
            }
          }
          sender
          recipient
          origin
          activeId
          amountXIn
          amountYIn
          amountXOut
          amountYOut
          amountUSD
          feesTokenX
          feesTokenY
          feesUSD
          timestamp
        }
      }
    `;

    const variables = {
      userAddress: userAddress.toLowerCase(),
      first,
    };

    const result = await this.query<{ swaps: any[] }>(query, variables);
    return result.data?.swaps || [];
  }

  /**
   * Get user's liquidity positions
   */
  async getUserLiquidityPositions(userAddress: string, first: number = 100): Promise<any[]> {
    const query = `
      query GetUserLiquidityPositions($userAddress: String!, $first: Int!) {
        liquidityPositions(
          where: { user: $userAddress }
          first: $first
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          user {
            id
          }
          lbPair {
            id
            name
            tokenX {
              id
              symbol
              name
              decimals
            }
            tokenY {
              id
              symbol
              name
              decimals
            }
            reserveX
            reserveY
            totalValueLockedUSD
          }
          userBinLiquidities {
            id
            binId
            liquidity
            timestamp
          }
          binsCount
          timestamp
        }
      }
    `;

    const variables = {
      userAddress: userAddress.toLowerCase(),
      first,
    };

    const result = await this.query<{ liquidityPositions: any[] }>(query, variables);
    return result.data?.liquidityPositions || [];
  }

  /**
   * Get user's mint and burn history
   */
  async getUserMintsBurns(userAddress: string, first: number = 100): Promise<any[]> {
    const query = `
      query GetUserMintsBurns($userAddress: String!, $first: Int!) {
        mints(
          where: { sender: $userAddress }
          first: $first
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
            blockNumber
          }
          lbPair {
            id
            name
            tokenX { symbol decimals }
            tokenY { symbol decimals }
          }
          sender
          recipient
          amountX
          amountY
          amountUSD
          timestamp
        }
        burns(
          where: { sender: $userAddress }
          first: $first
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
            blockNumber
          }
          lbPair {
            id
            name
            tokenX { symbol decimals }
            tokenY { symbol decimals }
          }
          sender
          recipient
          amountX
          amountY
          amountUSD
          timestamp
        }
      }
    `;

    const variables = {
      userAddress: userAddress.toLowerCase(),
      first,
    };

    const result = await this.query<{ mints: any[]; burns: any[] }>(query, variables);
    return [
      ...(result.data?.mints || []).map(m => ({ ...m, type: 'mint' })),
      ...(result.data?.burns || []).map(b => ({ ...b, type: 'burn' }))
    ].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all tokens
   */
  async getTokens(first: number = 100, skip: number = 0): Promise<Token[]> {
    const query = `
      query GetTokens($first: Int!, $skip: Int!) {
        tokens(
          first: $first
          skip: $skip
          orderBy: totalValueLockedUSD
          orderDirection: desc
        ) {
          id
          symbol
          name
          decimals
          volume
          volumeUSD
          totalValueLocked
          totalValueLockedUSD
          derivedAVAX
          txCount
          feesUSD
          totalSupply
        }
      }
    `;

    const variables = {
      first,
      skip,
    };

    const result = await this.query<{ tokens: Token[] }>(query, variables);
    return result.data?.tokens || [];
  }

  /**
   * Get factory data for global analytics
   */
  async getFactoryData(): Promise<any> {
    const query = `
      query GetFactoryData {
        lbfactories {
          id
          pairCount
          volumeUSD
          volumeAVAX
          untrackedVolumeUSD
          totalValueLockedUSD
          totalValueLockedAVAX
          txCount
          tokenCount
          userCount
          flashloanFee
          feesUSD
          feesAVAX
        }
      }
    `;

    const result = await this.query<{ lbfactories: any[] }>(query);
    return result.data?.lbfactories?.[0] || null;
  }

  /**
   * Search pools by token symbols
   */
  async searchPools(searchTerm: string, first: number = 50): Promise<LBPair[]> {
    const query = `
      query SearchPools($searchTerm: String!, $first: Int!) {
        lbpairs(
          where: {
            or: [
              { tokenX_: { symbol_contains_nocase: $searchTerm } },
              { tokenY_: { symbol_contains_nocase: $searchTerm } },
              { tokenX_: { name_contains_nocase: $searchTerm } },
              { tokenY_: { name_contains_nocase: $searchTerm } }
            ]
          }
          first: $first
          orderBy: totalValueLockedUSD
          orderDirection: desc
        ) {
          id
          name
          tokenX {
            id
            symbol
            name
            decimals
          }
          tokenY {
            id
            symbol
            name
            decimals
          }
          reserveX
          reserveY
          totalValueLockedUSD
          volumeUSD
          feesUSD
          txCount
          liquidityProviderCount
          binStep
          activeId
        }
      }
    `;

    const variables = {
      searchTerm,
      first,
    };

    const result = await this.query<{ lbpairs: LBPair[] }>(query, variables);
    return result.data?.lbpairs || [];
  }
}

/**
 * Factory function to create a subgraph client instance
 * This allows for better testing and environment-specific configuration
 */
export function createSubgraphClient(env?: any): SubgraphClient {
  return new SubgraphClient(undefined, env);
}

/**
 * Create a singleton instance of the subgraph client
 */
export const subgraphClient = new SubgraphClient();

/**
 * Default client instance for backward compatibility
 */
export { subgraphClient as default };

/**
 * Utility function to check if the subgraph is available and synced
 */
export async function isSubgraphHealthy(): Promise<{ healthy: boolean; blockNumber?: number; error?: string }> {
  try {
    const meta = await subgraphClient.getMeta();
    if (!meta) {
      return { healthy: false, error: 'No metadata available' };
    }

    if (meta.hasIndexingErrors) {
      return { healthy: false, error: 'Subgraph has indexing errors' };
    }

    // Check if the subgraph is reasonably up to date (within last hour)
    const currentTime = Date.now() / 1000;
    const timeDiff = currentTime - meta.block.timestamp;
    
    if (timeDiff > 3600) { // More than 1 hour behind
      return { 
        healthy: false, 
        error: `Subgraph is ${Math.floor(timeDiff / 60)} minutes behind`,
        blockNumber: meta.block.number 
      };
    }

    return { healthy: true, blockNumber: meta.block.number };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
