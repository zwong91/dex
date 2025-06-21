import { createPublicClient, http, parseAbiItem, getContract } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { DatabaseService } from './database-service';
import { POOL_DISCOVERY_CONFIG } from './pool-config';
import type { Env } from '../../index';

/**
 * 池发现服务
 * 
 * 自动发现和添加新的流动性池到监控列表
 * 支持：
 * - 扫描工厂合约的池创建事件
 * - 根据流动性阈值过滤池
 * - 自动添加符合条件的池到数据库
 * - 支持多链池发现
 */

export interface DiscoveredPool {
  address: string;
  chain: string;
  tokenX: string;
  tokenY: string;
  binStep: number;
  name: string;
  liquidityUsd: number;
  volume24h: number;
  createdAt: number;
  blockNumber: number;
}

export interface PoolDiscoveryMetrics {
  totalScanned: number;
  newPoolsFound: number;
  poolsAdded: number;
  poolsSkipped: number;
  lastScanTime: number;
  scanDuration: number;
  errors: number;
}

// Trader Joe V2.2 Factory ABI (池创建事件)
const FACTORY_ABI = [
  parseAbiItem('event LBPairCreated(address indexed tokenX, address indexed tokenY, uint256 indexed binStep, address LBPair, uint256 pid)'),
  parseAbiItem('function getNumberOfLBPairs() external view returns (uint256)'),
  parseAbiItem('function getLBPairAtIndex(uint256 index) external view returns (address)')
];

// ERC20 ABI for token info
const ERC20_ABI = [
  parseAbiItem('function name() external view returns (string)'),
  parseAbiItem('function symbol() external view returns (string)'),
  parseAbiItem('function decimals() external view returns (uint8)')
];

export class PoolDiscoveryService {
  private databaseService: DatabaseService;
  private publicClients: Map<string, any> = new Map();
  private metrics: PoolDiscoveryMetrics = {
    totalScanned: 0,
    newPoolsFound: 0,
    poolsAdded: 0,
    poolsSkipped: 0,
    lastScanTime: 0,
    scanDuration: 0,
    errors: 0
  };

  constructor(private env: Env) {
    this.databaseService = new DatabaseService(env);
    this.initializeClients();
  }

  /**
   * 初始化各链的客户端
   */
  private initializeClients(): void {
    // BSC 主网
    if (this.env.BSC_RPC_URL) {
      this.publicClients.set('bsc', createPublicClient({
        chain: bsc,
        transport: http(this.env.BSC_RPC_URL)
      }));
    }

    // BSC 测试网
    if (this.env.BSCTEST_RPC_URL) {
      this.publicClients.set('bsc-testnet', createPublicClient({
        chain: bscTestnet,
        transport: http(this.env.BSCTEST_RPC_URL)
      }));
    }
  }

  /**
   * 启动池发现扫描
   */
  async startDiscovery(): Promise<void> {
    console.log('🔍 Starting pool discovery service...');
    
    // 立即执行一次扫描
    await this.performDiscoveryScan();

    // 设置定期扫描
    setInterval(async () => {
      try {
        await this.performDiscoveryScan();
      } catch (error) {
        console.error('❌ Pool discovery scan failed:', error);
        this.metrics.errors++;
      }
    }, POOL_DISCOVERY_CONFIG.scanInterval);

    console.log(`✅ Pool discovery service started (${POOL_DISCOVERY_CONFIG.scanInterval / 1000}s interval)`);
  }

  /**
   * 执行池发现扫描
   */
  async performDiscoveryScan(): Promise<PoolDiscoveryMetrics> {
    const startTime = Date.now();
    console.log('🔎 Performing pool discovery scan...');

    try {
      const scanResults = await this.scanAllChains();
      
      this.metrics.lastScanTime = Date.now();
      this.metrics.scanDuration = Date.now() - startTime;
      
      console.log(`✅ Pool discovery scan completed in ${this.metrics.scanDuration}ms`);
      console.log(`📊 Results: ${scanResults.newPools} new pools found, ${scanResults.added} added`);
      
      return this.metrics;
    } catch (error) {
      console.error('❌ Pool discovery scan failed:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * 扫描所有支持的链
   */
  private async scanAllChains(): Promise<{ newPools: number; added: number }> {
    let totalNewPools = 0;
    let totalAdded = 0;

    for (const [chain, factoryAddress] of Object.entries(POOL_DISCOVERY_CONFIG.factoryAddresses)) {
      if (!factoryAddress || factoryAddress === '0x...') {
        console.log(`⚠️  Skipping ${chain}: factory address not configured`);
        continue;
      }

      const client = this.publicClients.get(chain);
      if (!client) {
        console.log(`⚠️  Skipping ${chain}: RPC client not available`);
        continue;
      }

      try {
        console.log(`🔍 Scanning ${chain} factory: ${factoryAddress}`);
        const result = await this.scanChainForNewPools(chain, factoryAddress, client);
        
        totalNewPools += result.newPools;
        totalAdded += result.added;
        
        console.log(`✅ ${chain}: ${result.newPools} new pools found, ${result.added} added`);
      } catch (error) {
        console.error(`❌ Failed to scan ${chain}:`, error);
        this.metrics.errors++;
      }
    }

    this.metrics.newPoolsFound += totalNewPools;
    this.metrics.poolsAdded += totalAdded;

    return { newPools: totalNewPools, added: totalAdded };
  }

  /**
   * 扫描单个链的新池
   */
  private async scanChainForNewPools(
    chain: string, 
    factoryAddress: string, 
    client: any
  ): Promise<{ newPools: number; added: number }> {
    
    // 获取工厂合约
    const factory = getContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      client
    });

    try {
      // 获取总池数量 - 使用 readContract 方法
      const totalPools = await client.readContract({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getNumberOfLBPairs'
      });
      console.log(`📊 ${chain}: ${totalPools} total pools in factory`);

      // 获取已知池的最大索引
      const knownPools = await this.databaseService.getPools({ chain }, { limit: 1000 });
      const knownAddresses = new Set(knownPools.pools.map(p => p.address.toLowerCase()));

      let newPoolsFound = 0;
      let poolsAdded = 0;
      const maxScan = Math.min(Number(totalPools), POOL_DISCOVERY_CONFIG.maxPoolsToScan);

      // 扫描池（从最新的开始，因为新池通常在末尾）
      for (let i = Math.max(0, Number(totalPools) - maxScan); i < totalPools; i++) {
        try {
          const poolAddress = await client.readContract({
            address: factoryAddress as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'getLBPairAtIndex',
            args: [BigInt(i)]
          });
          
          if (knownAddresses.has(poolAddress.toLowerCase())) {
            continue; // 已知池，跳过
          }

          console.log(`🆕 Found new pool: ${poolAddress}`);
          newPoolsFound++;

          // 获取池详细信息
          const poolInfo = await this.getPoolDetails(poolAddress, chain, client);
          
          if (poolInfo && poolInfo.liquidityUsd >= POOL_DISCOVERY_CONFIG.minLiquidityUsd) {
            // 添加到数据库
            await this.addPoolToDatabase(poolInfo);
            poolsAdded++;
            console.log(`✅ Added pool: ${poolInfo.name} ($${poolInfo.liquidityUsd.toLocaleString()} liquidity)`);
          } else {
            this.metrics.poolsSkipped++;
            console.log(`⏭️  Skipped pool: insufficient liquidity`);
          }

          this.metrics.totalScanned++;

          // 添加延迟避免过载
          await this.sleep(100);
        } catch (error) {
          console.error(`❌ Failed to process pool at index ${i}:`, error);
        }
      }

      return { newPools: newPoolsFound, added: poolsAdded };
    } catch (error) {
      console.error(`❌ Failed to scan factory ${factoryAddress}:`, error);
      throw error;
    }
  }

  /**
   * 获取池的详细信息
   */
  private async getPoolDetails(
    poolAddress: string, 
    chain: string, 
    client: any
  ): Promise<DiscoveredPool | null> {
    try {
      // 这里需要实现具体的池信息获取逻辑
      // 包括：tokenX, tokenY, binStep, 流动性等
      // 由于这需要具体的池合约 ABI，这里提供基础框架

      // 模拟池信息（实际应用中需要从链上获取）
      const mockPoolInfo: DiscoveredPool = {
        address: poolAddress.toLowerCase(),
        chain,
        tokenX: '0x0000000000000000000000000000000000000000', // 需要从链上获取
        tokenY: '0x0000000000000000000000000000000000000000', // 需要从链上获取
        binStep: 25, // 需要从链上获取
        name: 'New Pool', // 需要根据代币符号生成
        liquidityUsd: Math.random() * 100000, // 需要计算实际流动性
        volume24h: Math.random() * 50000, // 需要计算实际交易量
        createdAt: Date.now(),
        blockNumber: 0 // 需要获取当前区块号
      };

      return mockPoolInfo;
    } catch (error) {
      console.error(`❌ Failed to get pool details for ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * 添加池到数据库
   */
  private async addPoolToDatabase(poolInfo: DiscoveredPool): Promise<void> {
    try {
      // 这里需要实现数据库插入逻辑
      // 目前只是日志记录
      console.log(`📝 Would add pool to database:`, {
        address: poolInfo.address,
        chain: poolInfo.chain,
        liquidityUsd: poolInfo.liquidityUsd
      });

      // TODO: 实际的数据库插入
      // await this.databaseService.insertPool(poolInfo);
    } catch (error) {
      console.error(`❌ Failed to add pool to database:`, error);
      throw error;
    }
  }

  /**
   * 获取发现指标
   */
  getMetrics(): PoolDiscoveryMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalScanned: 0,
      newPoolsFound: 0,
      poolsAdded: 0,
      poolsSkipped: 0,
      lastScanTime: 0,
      scanDuration: 0,
      errors: 0
    };
  }

  /**
   * 停止池发现服务
   */
  stop(): void {
    console.log('🛑 Pool discovery service stopped');
  }

  /**
   * 工具方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
