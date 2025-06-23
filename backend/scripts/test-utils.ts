/**
 * 测试工具函数
 */
import type { Env } from '../src/index';

// 增强的 mock D1 数据库实现（完全兼容 drizzle-orm）
class MockD1Database {
  private tables: Map<string, any[]> = new Map();

  prepare(query: string) {
    const self = this;
    
    return {
      bind(...params: any[]) {
        // 返回一个新对象，包含所有必要方法
        return {
          // 原生 D1Database 方法 - drizzle-orm 直接调用这些
          async all() {
            // 模拟各种查询
            if (query.includes('count(*)') || query.includes('COUNT(*)')) {
              if (query.includes('pools')) {
                return {
                  results: [{ count: 6 }],
                  success: true,
                  meta: { duration: 0.1, rows_read: 1, rows_written: 0 }
                };
              }
              if (query.includes('swap_events')) {
                return {
                  results: [{ count: 0 }],
                  success: true,
                  meta: { duration: 0.1, rows_read: 1, rows_written: 0 }
                };
              }
            }
            
            // 模拟同步状态查询
            if (query.includes('sync_status')) {
              return {
                results: [],
                success: true,
                meta: { duration: 0.1, rows_read: 0, rows_written: 0 }
              };
            }
            
            if (query.includes('pools') && query.includes('status')) {
              return {
                results: [
                  {
                    id: '1',
                    address: '0x36696169c63e42cd08ce11f5deebbcebae652050',
                    name: 'WBNB/USDT',
                    tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                    tokenY: '0x55d398326f99059fF775485246999027B3197955',
                    chain: 'bsc',
                    binStep: 20,
                    status: 'active'
                  },
                  {
                    id: '2',
                    address: '0x7e8fb962c4e2f967db50a6c0bf8dd113afbf1111',
                    name: 'WBNB/BUSD',
                    tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                    tokenY: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
                    chain: 'bsc',
                    binStep: 20,
                    status: 'active'
                  }
                ],
                success: true,
                meta: { duration: 0.1, rows_read: 2, rows_written: 0 }
              };
            }
            
            // 通用的池子查询（适用于 getAllTokens 和其他池查询）
            if (query.includes('pools') && !query.includes('count') && !query.includes('status')) {
              return {
                results: [
                  {
                    id: '1',
                    address: '0x36696169c63e42cd08ce11f5deebbcebae652050',
                    name: 'WBNB/USDT',
                    tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                    tokenY: '0x55d398326f99059fF775485246999027B3197955',
                    chain: 'bsc',
                    binStep: 20,
                    status: 'active'
                  },
                  {
                    id: '2',
                    address: '0x7e8fb962c4e2f967db50a6c0bf8dd113afbf1111',
                    name: 'WBNB/BUSD',
                    tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
                    tokenY: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
                    chain: 'bsc',
                    binStep: 20,
                    status: 'active'
                  }
                ],
                success: true,
                meta: { duration: 0.1, rows_read: 2, rows_written: 0 }
              };
            }
            
            return {
              results: [],
              success: true,
              meta: { duration: 0.1, rows_read: 0, rows_written: 0 }
            };
          },
          
          async first() {
            const result = await this.all();
            return result.results.length > 0 ? result.results[0] : null;
          },
          
          async run() {
            return {
              success: true,
              meta: { 
                duration: 0.1, 
                rows_read: 0, 
                rows_written: 1, 
                last_row_id: 1,
                changes: 1
              }
            };
          },
          
          // drizzle-orm 可能需要的其他方法
          async raw() {
            const result = await this.all();
            return result.results;
          }
        };
      },
      
      // 无参数版本的方法
      async all() {
        return this.bind().all();
      },
      
      async first() {
        return this.bind().first();
      },
      
      async run() {
        return this.bind().run();
      }
    };
  }

  async batch(statements: any[]) {
    return statements.map(() => ({
      success: true,
      meta: { duration: 0.1, rows_read: 0, rows_written: 1, changes: 1 }
    }));
  }
  
  async exec(query: string) {
    return {
      count: 0,
      duration: 0.1,
      success: true
    };
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
    BSC_TEST_INFURA_URL: "https://bsc-testnet.infura.io/v3/365ce9d871ff42228dc2a23a6daff8dc",
    BSC_INFURA_URL: "https://bsc-mainnet.infura.io/v3/365ce9d871ff42228dc2a23a6daff8dc",
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
