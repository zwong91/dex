import type { Context } from 'hono';
import { createSubgraphClient } from '../graphql/client';
import type { Env } from '../../index';

export function createSwapsHandler(action: string) {
  return async function swapsHandler(c: Context<{ Bindings: Env }>) {
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
          return await handleSwapsList(c, subgraphClient);
        default:
          return c.json({ error: 'Invalid action', timestamp: new Date().toISOString() }, 400);
      }
    } catch (error) {
      console.error('Swaps handler error:', error);
      return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }, 500);
    }
  };
}

async function handleSwapsList(c: Context<{ Bindings: Env }>, subgraphClient: any) {
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  const swaps = await subgraphClient.getUserSwaps('', limit); // TODO: support filter by user or pool if needed
  return c.json({
    success: true,
    data: swaps,
    pagination: { page, limit, total: swaps.length },
    timestamp: new Date().toISOString()
  });
}
