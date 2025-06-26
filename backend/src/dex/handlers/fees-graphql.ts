import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

export function createFeesHandler(action: string) {
  return async function feesHandler(c: Context<{ Bindings: Env }>) {
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
          return await handleFeesList(c, subgraphClient);
        default:
          return c.json({ error: 'Invalid action', timestamp: new Date().toISOString() }, 400);
      }
    } catch (error) {
      console.error('Fees handler error:', error);
      return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }, 500);
    }
  };
}

async function handleFeesList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
  const pools = await subgraphClient.getPools(100, 0);
  const fees = pools.map((pool: any) => ({
    id: pool.id,
    feesUSD: pool.feesUSD,
    volumeUSD: pool.volumeUSD
  }));
  return c.json({
    success: true,
    data: fees,
    timestamp: new Date().toISOString()
  });
}
