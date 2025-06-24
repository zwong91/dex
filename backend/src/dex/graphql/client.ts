/**
 * GraphQL Client for Subgraph Integration
 * 
 * This module provides a GraphQL client to query data from the deployed subgraph.
 * It acts as a bridge between the REST API endpoints and the GraphQL subgraph.
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

export interface Pool {
  id: string;
  name: string;
  tokenX: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  tokenY: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  binStep: number;
  activeId: number;
  reserveX: string;
  reserveY: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  feesUSD: string;
  txCount: number;
  liquidityProviderCount: number;
  tokenXPrice: string;
  tokenYPrice: string;
  tokenXPriceUSD: string;
  tokenYPriceUSD: string;
  timestamp: number;
  block: number;
  // Calculated fields
  liquidityUsd?: number;
  volume24h?: string;
  fees24h?: string;
  apr?: number;
}

export interface SwapEvent {
  id: string;
  transaction: {
    id: string;
  };
  timestamp: number;
  lbPair: {
    id: string;
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
}

export interface LiquidityPosition {
  id: string;
  user: {
    id: string;
  };
  lbPair: {
    id: string;
    name: string;
    tokenX: {
      id: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    tokenY: {
      id: string;
      symbol: string;
      name: string;
      decimals: number;
    };
  };
  userBinLiquidities: Array<{
    id: string;
    binId: number;
    liquidity: string;
    timestamp: number;
  }>;
  binsCount: number;
  block: number;
  timestamp: number;
}

/**
 * GraphQL Client for querying the subgraph
 */
export class SubgraphClient {
  private endpoint: string;
  
  constructor(endpoint: string = 'http://localhost:8000/subgraphs/name/entysquare/indexer-bnb') {
    this.endpoint = endpoint;
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

      // Check if the subgraph is reasonably up to date (within last hour)
      const currentTime = Date.now() / 1000;
      const timeDiff = currentTime - meta.block.timestamp;
      
      if (timeDiff > 3600) { // More than 1 hour behind
        return { 
          healthy: false, 
          error: `Subgraph is ${Math.floor(timeDiff / 60)} minutes behind`,
          blockNumber: meta.block.number,
          hasIndexingErrors: false
        };
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
    orderBy: string = 'timestamp',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<Pool[]> {
    const query = `
      query GetPools($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        lbpairs(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: { liquidityProviderCount_gt: 0 }
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
          binStep
          activeId
          reserveX
          reserveY
          totalValueLockedUSD
          volumeUSD
          feesUSD
          txCount
          liquidityProviderCount
          tokenXPrice
          tokenYPrice
          tokenXPriceUSD
          tokenYPriceUSD
          timestamp
          block
        }
      }
    `;

    const variables = {
      first,
      skip,
      orderBy,
      orderDirection,
    };

    const result = await this.query<{ lbpairs: Pool[] }>(query, variables);
    return result.data?.lbpairs || [];
  }

  /**
   * Get a specific pool by address
   */
  async getPool(pairAddress: string): Promise<Pool | null> {
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
          binStep
          activeId
          reserveX
          reserveY
          totalValueLockedUSD
          volumeUSD
          feesUSD
          txCount
          liquidityProviderCount
          tokenXPrice
          tokenYPrice
          tokenXPriceUSD
          tokenYPriceUSD
          timestamp
          block
        }
      }
    `;

    const result = await this.query<{ lbpairs: Pool[] }>(query, { pairAddress: pairAddress.toLowerCase() });
    return result.data?.lbpairs?.[0] || null;
  }

  /**
   * Get recent swap events for a pool
   */
  async getPoolSwaps(
    pairAddress: string,
    first: number = 100,
    skip: number = 0
  ): Promise<SwapEvent[]> {
    const query = `
      query GetPoolSwaps($pairAddress: String!, $first: Int!, $skip: Int!) {
        swaps(
          where: { pool: $pairAddress }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transaction {
            id
            timestamp
            blockNumber
          }
          pool {
            id
            pairAddress
          }
          sender
          to
          amountXIn
          amountYIn
          amountXOut
          amountYOut
          fees
          timestamp
        }
      }
    `;

    const variables = {
      pairAddress: pairAddress.toLowerCase(),
      first,
      skip,
    };

    const result = await this.query<{ swaps: SwapEvent[] }>(query, variables);
    return result.data?.swaps || [];
  }

  /**
   * Get user's liquidity positions
   */
  async getUserPositions(userAddress: string, first: number = 100): Promise<LiquidityPosition[]> {
    const query = `
      query GetUserPositions($userAddress: String!, $first: Int!) {
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
          }
          userBinLiquidities {
            id
            binId
            liquidity
            timestamp
          }
          binsCount
          block
          timestamp
        }
      }
    `;

    const variables = {
      userAddress: userAddress.toLowerCase(),
      first,
    };

    const result = await this.query<{ liquidityPositions: LiquidityPosition[] }>(query, variables);
    return result.data?.liquidityPositions || [];
  }

  /**
   * Get 24h volume and fees for a pool
   */
  async getPool24hStats(pairAddress: string): Promise<{ volume24h: number; fees24h: number; swapCount: number }> {
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    
    const query = `
      query GetPool24hStats($pairAddress: String!, $timestamp: Int!) {
        swaps(
          where: { 
            lbPair: $pairAddress,
            timestamp_gte: $timestamp
          }
          first: 1000
        ) {
          id
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
      pairAddress: pairAddress.toLowerCase(),
      timestamp: twentyFourHoursAgo,
    };

    const result = await this.query<{ swaps: Array<{
      id: string;
      amountXIn: string;
      amountYIn: string;
      amountXOut: string;
      amountYOut: string;
      amountUSD: string;
      feesTokenX: string;
      feesTokenY: string;
      feesUSD: string;
      timestamp: number;
    }> }>(query, variables);

    const swaps = result.data?.swaps || [];
    
    let totalVolumeUsd = 0;
    let totalFeesUsd = 0;
    
    // Calculate total volume and fees using USD amounts from subgraph
    for (const swap of swaps) {
      totalVolumeUsd += parseFloat(swap.amountUSD || '0');
      totalFeesUsd += parseFloat(swap.feesUSD || '0');
    }

    return {
      volume24h: totalVolumeUsd,
      fees24h: totalFeesUsd,
      swapCount: swaps.length,
    };
  }

  /**
   * Search pools by token symbols
   */
  async searchPools(searchTerm: string, first: number = 50): Promise<Pool[]> {
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
          orderBy: timestamp
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
          binStep
          activeId
          reserveX
          reserveY
          totalValueLockedUSD
          volumeUSD
          feesUSD
          txCount
          liquidityProviderCount
          timestamp
          block
        }
      }
    `;

    const variables = {
      searchTerm,
      first,
    };

    const result = await this.query<{ lbpairs: Pool[] }>(query, variables);
    return result.data?.lbpairs || [];
  }
}

/**
 * Create a singleton instance of the subgraph client
 */
export const subgraphClient = new SubgraphClient();

/**
 * Factory function to create a subgraph client instance
 * This allows for better testing and environment-specific configuration
 */
export function createSubgraphClient(env?: any): SubgraphClient {
  const client = new SubgraphClient();
  
  // Set environment-specific configuration if provided
  if (env?.SUBGRAPH_URL) {
    // In a real implementation, you might want to configure the client URL here
    console.log('Using subgraph URL from environment:', env.SUBGRAPH_URL);
  }
  
  return client;
}

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
