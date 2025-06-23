/**
 * DEX 池配置文件
 * 
 * 主要用于池自动发现和动态管理
 * 池数据通过自动发现功能从工厂合约获取并存储到数据库
 */

// 所有池配置、地址等都应通过数据库和自动发现功能动态获取

/**
 * 池发现配置
 * 
 * 用于自动发现新的流动性池的核心配置
 * 这是现在获取池数据的主要方式
 */


// 用于自动发现新的流动性池的核心配置（动态读取环境变量）
export function getPoolDiscoveryConfig(env: any) {
  return {
    // Trader Joe V2.2 Factory 合约地址（从环境变量读取）
    factoryAddresses: {
      'bsc': env.LB_FACTORY_BSC,
      'bsc-testnet': env.LB_FACTORY_BSCTEST
    },
    // 最小流动性阈值（USD）
    minLiquidityUsd: 0,
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
    },
    // 自动发现优先级配置
    priorityTokens: {
      // 高优先级代币地址（主流代币）
      high: [
        '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
        '0x55d398326f99059fF775485246999027B3197955', // USDT
        '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
        '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
        '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH
      ],
      // 中等优先级代币
      medium: [
        '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
        '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
      ]
    }
  };
}

/**
 * 自动池发现辅助函数
 * 
 * 这些函数支持从工厂合约自动发现和评估池的质量
 */

/**
 * 获取指定链的工厂合约地址
 */
export function getFactoryAddressForChain(chain: string, env: any): string | null {
  const config = getPoolDiscoveryConfig(env);
  return config.factoryAddresses[chain as keyof typeof config.factoryAddresses] || null;
}

/**
 * 检查代币是否为高优先级
 */
export function isHighPriorityToken(tokenAddress: string, env: any): boolean {
  const config = getPoolDiscoveryConfig(env);
  const normalizedAddress = tokenAddress.toLowerCase();
  return config.priorityTokens.high
    .map((addr: string) => addr.toLowerCase())
    .includes(normalizedAddress);
}

/**
 * 检查代币是否为中等优先级
 */
export function isMediumPriorityToken(tokenAddress: string, env: any): boolean {
  const config = getPoolDiscoveryConfig(env);
  const normalizedAddress = tokenAddress.toLowerCase();
  return config.priorityTokens.medium
    .map((addr: string) => addr.toLowerCase())
    .includes(normalizedAddress);
}

/**
 * 根据代币优先级确定池的优先级
 */
export function determinePoolPriority(tokenX: string, tokenY: string, env: any): 'high' | 'medium' | 'low' {
  if (isHighPriorityToken(tokenX, env) && isHighPriorityToken(tokenY, env)) {
    return 'high';
  }
  if (
    isHighPriorityToken(tokenX, env) ||
    isHighPriorityToken(tokenY, env) ||
    isMediumPriorityToken(tokenX, env) ||
    isMediumPriorityToken(tokenY, env)
  ) {
    return 'medium';
  }
  return 'low';
}
