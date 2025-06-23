import { createPublicClient, http, parseAbiItem, getContract } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { DatabaseService } from './database-service';
import { getPoolDiscoveryConfig } from './pool-config';
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
    if (this.env.BSC_INFURA_URL) {
      this.publicClients.set('bsc', createPublicClient({
        chain: bsc,
        transport: http(this.env.BSC_INFURA_URL)
      }));
    }

    // BSC 测试网
    if (this.env.BSC_TEST_INFURA_URL) {
      this.publicClients.set('bsc-testnet', createPublicClient({
        chain: bscTestnet,
        transport: http(this.env.BSC_TEST_INFURA_URL)
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
    const config = getPoolDiscoveryConfig(this.env);
    setInterval(async () => {
      try {
        await this.performDiscoveryScan();
      } catch (error) {
        console.error('❌ Pool discovery scan failed:', error);
        this.metrics.errors++;
      }
    }, config.scanInterval);

    console.log(`✅ Pool discovery service started (${config.scanInterval / 1000}s interval)`);
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

    const config = getPoolDiscoveryConfig(this.env);
    for (const [chain, factoryAddress] of Object.entries(config.factoryAddresses)) {
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
      const knownAddresses = new Set(
        knownPools.pools
          .map(p => p.address)
          .filter(address => address && typeof address === 'string')
          .map(address => address.toLowerCase())
      );

      let newPoolsFound = 0;
      let poolsAdded = 0;
      const config = getPoolDiscoveryConfig(this.env);
      const maxScan = Math.min(Number(totalPools), config.maxPoolsToScan);

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
          
          const config = getPoolDiscoveryConfig(this.env);
          if (poolInfo && poolInfo.liquidityUsd >= config.minLiquidityUsd) {
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
      // 先判断是否为合约
      const code = await client.getBytecode({ address: poolAddress as `0x${string}` });
      if (!code || code === '0x') {
        console.warn(`⏭️  ${poolAddress} is not a contract, skipping`);
        return null;
      }

      // Trader Joe LB Pool ABI - 获取池的基本信息
      const LB_POOL_ABI = [
        parseAbiItem('function getTokenX() external view returns (address)'),
        parseAbiItem('function getTokenY() external view returns (address)'),
        parseAbiItem('function getBinStep() external view returns (uint256)'),
        parseAbiItem('function getReserves() external view returns (uint128 reserveX, uint128 reserveY)'),
        parseAbiItem('function getActiveId() external view returns (uint24)')
      ];

      // 获取池的基本信息
      let tokenX, tokenY, binStep, reserves, activeId, blockNumber;
      try {
        [tokenX, tokenY, binStep, reserves, activeId, blockNumber] = await Promise.all([
          client.readContract({
            address: poolAddress as `0x${string}`,
            abi: LB_POOL_ABI,
            functionName: 'getTokenX'
          }),
          client.readContract({
            address: poolAddress as `0x${string}`,
            abi: LB_POOL_ABI,
            functionName: 'getTokenY'
          }),
          client.readContract({
            address: poolAddress as `0x${string}`,
            abi: LB_POOL_ABI,
            functionName: 'getBinStep'
          }),
          client.readContract({
            address: poolAddress as `0x${string}`,
            abi: LB_POOL_ABI,
            functionName: 'getReserves'
          }).catch(() => ({ reserveX: 0n, reserveY: 0n })),
          client.readContract({
            address: poolAddress as `0x${string}`,
            abi: LB_POOL_ABI,
            functionName: 'getActiveId'
          }).catch(() => 0),
          client.getBlockNumber()
        ]);
      } catch (err) {
        console.warn(`⏭️  ${poolAddress} is not a valid LB pool, skipping. Reason:`, (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err));
        return null;
      }

      // 获取代币信息
      const [tokenXInfo, tokenYInfo] = await Promise.all([
        this.getTokenInfo(tokenX, client),
        this.getTokenInfo(tokenY, client)
      ]);

      // 计算流动性 (简化计算，实际需要考虑价格)
      // 验证储备和小数位数值的有效性
      const reserveXRaw = reserves.reserveX || 0n;
      const reserveYRaw = reserves.reserveY || 0n;
      const decimalsX = tokenXInfo.decimals || 18;
      const decimalsY = tokenYInfo.decimals || 18;
      
      // 安全地转换储备值
      let reserveXNumber = 0;
      let reserveYNumber = 0;
      
      try {
        reserveXNumber = Number(reserveXRaw) / Math.pow(10, decimalsX);
        reserveYNumber = Number(reserveYRaw) / Math.pow(10, decimalsY);
        
        // 验证结果是有效数字
        if (!Number.isFinite(reserveXNumber)) {
          console.warn(`⚠️  Invalid reserveX calculation: ${reserveXRaw} / 10^${decimalsX}`);
          reserveXNumber = 0;
        }
        if (!Number.isFinite(reserveYNumber)) {
          console.warn(`⚠️  Invalid reserveY calculation: ${reserveYRaw} / 10^${decimalsY}`);
          reserveYNumber = 0;
        }
      } catch (error) {
        console.warn(`⚠️  Error calculating reserves:`, error);
        reserveXNumber = 0;
        reserveYNumber = 0;
      }
      
      // 简单估算 USD 流动性 (假设主要代币的价格)
      const estimatedLiquidityUsd = this.estimateLiquidityUsd(
        tokenX, tokenY, reserveXNumber, reserveYNumber
      );

      const poolInfo: DiscoveredPool = {
        address: poolAddress.toLowerCase(),
        chain,
        tokenX: tokenX.toLowerCase(),
        tokenY: tokenY.toLowerCase(),
        binStep: Number(binStep),
        name: `${tokenXInfo.symbol}/${tokenYInfo.symbol}`,
        liquidityUsd: estimatedLiquidityUsd,
        volume24h: 0, // 需要单独计算24小时交易量
        createdAt: Date.now(),
        blockNumber: Number(blockNumber)
      };

      console.log(`📊 Pool details: ${poolInfo.name} - $${poolInfo.liquidityUsd.toLocaleString()} liquidity`);
      
      return poolInfo;
    } catch (error) {
      console.error(`❌ Failed to get pool details for ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * 获取代币信息
   */
  private async getTokenInfo(tokenAddress: string, client: any): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    try {
      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'name'
        }).catch(() => 'Unknown'),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }).catch(() => 'UNK'),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals'
        }).catch(() => 18)
      ]);

      return {
        name: name || 'Unknown',
        symbol: symbol || 'UNK',
        decimals: Number(decimals) || 18
      };
    } catch (error) {
      console.error(`❌ Failed to get token info for ${tokenAddress}:`, error);
      return {
        name: 'Unknown',
        symbol: 'UNK',
        decimals: 18
      };
    }
  }

  /**
   * 估算流动性的USD价值
   */
  private estimateLiquidityUsd(
    tokenX: string, 
    tokenY: string, 
    reserveX: number, 
    reserveY: number
  ): number {
    // 主要稳定币和主流代币的大概价格 (BSC)
    const tokenPrices: { [key: string]: number } = {
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 600,    // WBNB ≈ $600
      '0x55d398326f99059ff775485246999027b3197955': 1,      // USDT ≈ $1
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 1,      // USDC ≈ $1
      '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': 100000,  // BTC ≈ $100000
      '0x2170ed0880ac9a755fd29b2688956bd959f933f8': 3000,   // ETH ≈ $3000
      '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': 1,      // DAI ≈ $1
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': 2,      // CAKE ≈ $2
    };

    const priceX = tokenPrices[tokenX.toLowerCase()] || 0;
    const priceY = tokenPrices[tokenY.toLowerCase()] || 0;

    // 验证 reserveX 和 reserveY 是有效数字
    if (!Number.isFinite(reserveX) || !Number.isFinite(reserveY) || reserveX < 0 || reserveY < 0) {
      console.warn(`⚠️  Invalid reserves: X=${reserveX}, Y=${reserveY}`);
      return 0;
    }

    const valueX = reserveX * priceX;
    const valueY = reserveY * priceY;

    // 验证计算出的值是有效数字
    if (!Number.isFinite(valueX) || !Number.isFinite(valueY)) {
      console.warn(`⚠️  Invalid calculated values: valueX=${valueX}, valueY=${valueY}`);
      return 0;
    }

    // 如果其中一个代币有价格，使用该代币的价值 * 2 作为总流动性
    if (priceX > 0 && priceY > 0) {
      const totalLiquidity = valueX + valueY;
      return Number.isFinite(totalLiquidity) ? totalLiquidity : 0;
    } else if (priceX > 0) {
      const estimatedLiquidity = valueX * 2;
      return Number.isFinite(estimatedLiquidity) ? estimatedLiquidity : 0;
    } else if (priceY > 0) {
      const estimatedLiquidity = valueY * 2;
      return Number.isFinite(estimatedLiquidity) ? estimatedLiquidity : 0;
    }

    // 如果都没有价格信息，但有储备，给一个最小估算值
    // 这避免了完全跳过可能有价值的池子
    if (reserveX > 0 || reserveY > 0) {
      console.log(`💡 Unknown tokens, using minimal liquidity estimate for: ${tokenX.slice(0,6)}.../${tokenY.slice(0,6)}...`);
      return 100; // 给一个最小的流动性估值，允许池子被发现
    }

    // 如果都没有价格信息和储备，返回0
    return 0;
  }

  /**
   * 添加池到数据库
   */
  private async addPoolToDatabase(poolInfo: DiscoveredPool): Promise<void> {
    try {
      const db = this.env.DB || this.env.D1_DATABASE;
      if (!db) {
        throw new Error('Database not available');
      }

      // 检查池是否已存在
      const existingPool = await db.prepare(`
        SELECT id FROM pools WHERE address = ? AND chain = ?
      `).bind(poolInfo.address.toLowerCase(), poolInfo.chain).first();

      if (existingPool) {
        console.log(`⏭️  Pool ${poolInfo.address} already exists, skipping`);
        return;
      }

      // 生成唯一ID
      const poolId = `${poolInfo.chain}-${poolInfo.address.toLowerCase()}`;

      // 插入池信息
      await db.prepare(`
        INSERT INTO pools (
          id, address, chain, token_x, token_y, bin_step, name, status, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        poolId,
        poolInfo.address.toLowerCase(),
        poolInfo.chain,
        poolInfo.tokenX.toLowerCase(),
        poolInfo.tokenY.toLowerCase(),
        poolInfo.binStep,
        poolInfo.name,
        'active',
        'v2.2'
      ).run();

      console.log(`✅ Added pool to database: ${poolInfo.name} (${poolInfo.address})`);

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
