import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

export function createPriceHandler(action: string) {
  return async function priceHandler(c: Context<{ Bindings: Env }>) {
    try {
      const subgraphClient = createSubgraphClient(c.env);
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
          return await handlePriceList(c, subgraphClient);
        default:
          return c.json({ error: 'Invalid action', timestamp: new Date().toISOString() }, 400);
      }
    } catch (error) {
      console.error('Price handler error:', error);
      return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }, 500);
    }
  };
}

async function handlePriceList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
  const pools = await subgraphClient.getPools(100, 0);
  const prices = pools.map((pool: any) => ({
    id: pool.id,
    tokenXPrice: pool.tokenXPrice,
    tokenYPrice: pool.tokenYPrice,
    tokenXPriceUSD: pool.tokenXPriceUSD,
    tokenYPriceUSD: pool.tokenYPriceUSD
  }));
  return c.json({
    success: true,
    data: prices,
    timestamp: new Date().toISOString()
  });
}
