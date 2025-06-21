/**
 * DEX 池配置文件
 * 
 * 包含需要监控和同步的流动性池地址
 * 按链分组，支持动态添加和管理
 */

export interface PoolConfig {
  address: string;
  tokenX: string;
  tokenY: string;
  binStep: number;
  name: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ChainPoolConfig {
  [chain: string]: PoolConfig[];
}

/**
 * Trader Joe V2.2 热门池配置
 * 
 * 这些是 BSC 链上最活跃的 Trader Joe 流动性池
 * 包含主要交易对和足够的流动性
 */
export const TRADER_JOE_POOLS: ChainPoolConfig = {
  'bsc': [
    // 主流 DEX 池 - 高活跃度和流动性
    {
      address: '0x36696169c63e42cd08ce11f5deebbcebae652050',  // PancakeSwap WBNB/USDT
      tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      tokenY: '0x55d398326f99059fF775485246999027B3197955', // USDT
      binStep: 25,
      name: 'WBNB/USDT',
      priority: 'high'
    },
    
    // WBNB/USDC 池
    {
      address: '0x133b3d95bad5405d14d53473671200e9342896bf',  // PancakeSwap WBNB/USDC
      tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      tokenY: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
      binStep: 25,
      name: 'WBNB/USDC',
      priority: 'high'
    },
    
    // BTCB/WBNB 池
    {
      address: '0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4',  // PancakeSwap BTCB/WBNB
      tokenX: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
      tokenY: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      binStep: 25,
      name: 'BTCB/WBNB',
      priority: 'medium'
    },
    
    // ETH/WBNB 池
    {
      address: '0x85faac652b707fdf6b1387afc6262b36c250927c',  // PancakeSwap ETH/WBNB
      tokenX: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH
      tokenY: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      binStep: 25,
      name: 'ETH/WBNB',
      priority: 'medium'
    },
    
    // CAKE/WBNB 池
    {
      address: '0x7bb89460599dbf32ee3aa50798bbceae2a5f7f6a',  // PancakeSwap CAKE/WBNB
      tokenX: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
      tokenY: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      binStep: 25,
      name: 'CAKE/WBNB',
      priority: 'medium'
    }
  ],
  
  'bsc-testnet': [
    // 测试网池 - 用于开发和测试
    {
      address: '0x1234567890123456789012345678901234567890',  // 测试网池地址
      tokenX: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB (testnet)
      tokenY: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',  // 测试 USDT
      binStep: 25,
      name: 'WBNB/USDT (Testnet)',
      priority: 'low'
    }
  ]
};

/**
 * 获取指定链的池配置
 */
export function getPoolConfigForChain(chain: string): PoolConfig[] {
  return TRADER_JOE_POOLS[chain] || [];
}

/**
 * 获取所有池地址（扁平化）
 */
export function getAllPoolAddresses(): string[] {
  const addresses: string[] = [];
  
  for (const chainPools of Object.values(TRADER_JOE_POOLS)) {
    for (const pool of chainPools) {
      if (pool.address && pool.address !== '0x...' && pool.address.length === 42) {
        addresses.push(pool.address.toLowerCase());
      }
    }
  }
  
  return addresses;
}

/**
 * 获取高优先级池地址
 */
export function getHighPriorityPools(): string[] {
  const addresses: string[] = [];
  
  for (const chainPools of Object.values(TRADER_JOE_POOLS)) {
    for (const pool of chainPools) {
      if (pool.priority === 'high' && pool.address && pool.address !== '0x...' && pool.address.length === 42) {
        addresses.push(pool.address.toLowerCase());
      }
    }
  }
  
  return addresses;
}

/**
 * 默认池配置 - 如果数据库为空时使用
 * 
 * 这些是 BSC 链上活跃的 DEX 流动性池地址
 * 虽然主要针对 Trader Joe，但也包含其他主流 DEX 的池作为监控对象
 */
export const DEFAULT_POOL_ADDRESSES = [
  // PancakeSwap V3 主要池（高流动性，活跃交易）
  '0x36696169c63e42cd08ce11f5deebbcebae652050', // WBNB/USDT Pool
  '0x133b3d95bad5405d14d53473671200e9342896bf', // WBNB/USDC Pool  
  '0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4', // BTCB/WBNB Pool
  '0x85faac652b707fdf6b1387afc6262b36c250927c', // ETH/WBNB Pool
  '0x7bb89460599dbf32ee3aa50798bbceae2a5f7f6a', // CAKE/WBNB Pool
  
  // 其他活跃池
  '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', // WBNB/BUSD Pool
  '0x74E4716E431f45807DCF19f284c7aA99F18a4fbc', // USDT/USDC Pool
];

/**
 * 池发现配置
 * 
 * 用于自动发现新的流动性池
 */
export const POOL_DISCOVERY_CONFIG = {
  // Trader Joe V2.2 Factory 合约地址
  factoryAddresses: {
    'bsc': '0x8e42f2F4101563bF679975178e880FD87d3eFd4e',      // Trader Joe V2.2 Factory (BSC)
    'bsc-testnet': '0x1234567890123456789012345678901234567890'  // 测试网工厂地址
  },
  
  // 最小流动性阈值（USD）
  minLiquidityUsd: 10000,
  
  // 扫描的最大池数量（每次扫描）
  maxPoolsToScan: 100,
  
  // 扫描间隔（毫秒）
  scanInterval: 60 * 60 * 1000, // 1小时
  
  // 池质量过滤器
  qualityFilters: {
    minVolume24h: 1000,      // 最小24小时交易量
    minTxCount24h: 10,       // 最小24小时交易次数
    maxAge: 30 * 24 * 60 * 60 * 1000, // 最大池龄（30天）
    requireVerifiedTokens: false  // 是否要求代币已验证
  }
};

/**
 * 初始化池数据到数据库
 * 
 * 这个函数用于首次启动时将池配置写入数据库
 */
export function getInitialPoolsForDatabase() {
  const poolsToInsert = [];
  
  for (const [chain, pools] of Object.entries(TRADER_JOE_POOLS)) {
    for (const pool of pools) {
      if (pool.address && pool.address !== '0x...' && pool.address.length === 42) {
        poolsToInsert.push({
          address: pool.address.toLowerCase(),
          chain,
          tokenX: pool.tokenX.toLowerCase(),
          tokenY: pool.tokenY.toLowerCase(),
          binStep: pool.binStep,
          name: pool.name,
          status: 'active',
          version: 'v2.2'
        });
      }
    }
  }
  
  return poolsToInsert;
}
