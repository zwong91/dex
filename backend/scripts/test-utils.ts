/**
 * 测试工具函数
 */
import type { Env } from '../src/index';

// 简单的 mock D1 数据库实现（用于测试）
class MockD1Database {
  private tables: Map<string, any[]> = new Map();

  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({ query, params }),
      first: async () => {
        // 简单的查询模拟
        if (query.includes('COUNT(*) as count FROM pools')) {
          return { count: 6 };
        }
        if (query.includes('COUNT(*) as count FROM swap_events')) {
          return { count: 0 };
        }
        if (query.includes('SELECT * FROM pools')) {
          return [
            {
              address: '0x36696169c63e42cd08ce11f5deebbcebae652050',
              name: 'WBNB/USDT',
              token_x: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
              token_y: '0x55d398326f99059fF775485246999027B3197955',
              chain: 'bsc',
              bin_step: 20
            }
          ];
        }
        return null;
      },
      all: async () => {
        return { results: [] };
      },
      run: async () => {
        return { success: true };
      }
    };
  }

  batch(statements: any[]) {
    return Promise.resolve(statements.map(() => ({ success: true })));
  }
}

export function createMockEnv(): Env {
  const mockEnv = {
    // Required KEY property
    KEY: 'mock-key',
    
    // D1 Database
    DB: new MockD1Database() as any,
    D1_DATABASE: new MockD1Database() as any,
    
    // R2 Storage
    R2: {} as any,
    
    // Environment variables  
    BSC_RPC_URL: 'https://bsc-dataseed1.binance.org/',
    BSCTEST_RPC_URL: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    LB_FACTORY_BSC: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e',
    LB_FACTORY_BSCTEST: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e',
    LB_ROUTER_BSC: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
    LB_ROUTER_BSCTEST: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
    LB_QUOTER_BSC: '0x64b57F4249aA99C84e0dC62FF7D4fb248C6D6dC5',
    LB_QUOTER_BSCTEST: '0x64b57F4249aA99C84e0dC62FF7D4fb248C6D6dC5',
    PRICE_API_URL: 'https://api.coingecko.com/api/v3',
    PRICE_API_KEY: 'mock-api-key',
    API_RATE_LIMIT: '100',
    NODE_ENV: 'test'
  };

  return mockEnv as unknown as Env;
}

export function createRealEnv(): Env {
  // 返回真实环境（从 wrangler 获取）
  // 这需要在 Cloudflare Workers 环境中运行
  throw new Error('Real environment only available in Cloudflare Workers context');
}
