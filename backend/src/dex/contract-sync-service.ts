import { DrizzleD1Database } from 'drizzle-orm/d1';
import { createPublicClient, http, parseAbi, getContract, formatUnits, type Address } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../database/schema';

// 简化的合约ABI，只包含view函数
export const FACTORY_ABI = parseAbi([
  'function getNumberOfLBPairs() external view returns (uint256)',
  'function getLBPairAtIndex(uint256 index) external view returns (address lbPair)',
  'function getLBPairInformation(address tokenA, address tokenB, uint256 binStep) external view returns (address lbPair, uint256 createdByOwner, bool ignoredForRouting)',
  'event LBPairCreated(address indexed tokenX, address indexed tokenY, uint256 indexed binStep, address lbPair, uint256 pid)'
]);

export const LB_PAIR_ABI = parseAbi([
  'function getTokenX() external view returns (address)',
  'function getTokenY() external view returns (address)',
  'function getBinStep() external view returns (uint16)',
  'function getActiveId() external view returns (uint24)',
  'function getReserves() external view returns (uint128 reserveX, uint128 reserveY)',
  'function getProtocolFees() external view returns (uint128 protocolFeeX, uint128 protocolFeeY)',
  'function totalSupply(uint256 id) external view returns (uint256)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
]);

export const ERC20_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
]);

export interface ContractSyncConfig {
  chain: string;
  rpcUrl: string;
  factoryAddress: Address;
  startFromIndex?: number;
  batchSize?: number;
}

export class ContractSyncService {
  private db: DrizzleD1Database<typeof schema>;
  private clients: Map<string, any> = new Map();
  private configs: Map<string, ContractSyncConfig> = new Map();

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
    this.initializeConfigs();
    this.initializeClients();
  }

  private initializeConfigs() {
    // BSC主网配置
    this.configs.set('binance', {
      chain: 'binance',
      rpcUrl: 'https://bsc-dataseed1.binance.org/',
      factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e' as Address,
      batchSize: 10
    });

    // BSC测试网配置  
    this.configs.set('bsctest', {
      chain: 'bsctest',
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e' as Address,
      batchSize: 10
    });
  }

  private initializeClients() {
    for (const [chainKey, config] of this.configs) {
      const chainConfig = chainKey === 'binance' ? bsc : bscTestnet;
      
      const client = createPublicClient({
        chain: chainConfig,
        transport: http(config.rpcUrl, {
          timeout: 30000, // 30秒超时
          retryCount: 3,
          retryDelay: 2000
        })
      });

      this.clients.set(chainKey, client);
    }
  }

  /**
   * 通过Factory合约发现所有池
   */
  async discoverPoolsFromFactory(chain: string): Promise<Address[]> {
    const config = this.configs.get(chain);
    const client = this.clients.get(chain);

    if (!config || !client) {
      throw new Error(`Chain ${chain} not configured`);
    }

    try {
      console.log(`🔍 发现 ${chain} 链上的池...`);

      // 获取总池数量
      const totalPairs = await client.readContract({
        address: config.factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getNumberOfLBPairs',
      }) as bigint;

      const totalCount = Number(totalPairs);
      console.log(`📊 工厂合约中共有 ${totalCount} 个池`);

      const pools: Address[] = [];
      const batchSize = config.batchSize || 10;

      // 批量获取池地址
      for (let i = 0; i < totalCount; i += batchSize) {
        const batch = Math.min(batchSize, totalCount - i);
        const promises = [];

        for (let j = 0; j < batch; j++) {
          const index = i + j;
          promises.push(
            client.readContract({
              address: config.factoryAddress,
              abi: FACTORY_ABI,
              functionName: 'getLBPairAtIndex',
              args: [BigInt(index)]
            }).catch((error: any) => {
              console.warn(`获取索引 ${index} 的池失败:`, error.message);
              return null;
            })
          );
        }

        const batchResults = await Promise.all(promises);
        const validPools = batchResults.filter((pool): pool is Address => pool !== null);
        pools.push(...validPools);

        console.log(`📥 已获取 ${pools.length}/${totalCount} 个池`);
        
        // 避免请求过快
        if (i + batchSize < totalCount) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ 成功发现 ${pools.length} 个池`);
      return pools;

    } catch (error) {
      console.error(`❌ 发现池失败:`, error);
      throw error;
    }
  }

  /**
   * 通过合约view函数获取池的详细信息
   */
  async getPoolInfoFromContract(chain: string, poolAddress: Address): Promise<any> {
    const client = this.clients.get(chain);
    
    if (!client) {
      throw new Error(`Chain ${chain} not configured`);
    }

    try {
      // 并行获取池的基本信息
      const [tokenX, tokenY, binStep, activeId, reserves, protocolFees] = await Promise.all([
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getTokenX',
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getTokenY',
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getBinStep',
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getActiveId',
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getReserves',
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getProtocolFees',
        })
      ]);

      // 获取代币信息
      const [tokenXInfo, tokenYInfo] = await Promise.all([
        this.getTokenInfoFromContract(chain, tokenX as Address),
        this.getTokenInfoFromContract(chain, tokenY as Address)
      ]);

      // 计算总流动性（获取活跃bin周围的供应量）
      const totalSupply = await this.calculateTotalSupplyFromContract(
        chain, 
        poolAddress, 
        activeId as number
      );

      return {
        address: poolAddress.toLowerCase(),
        chain,
        tokenX: (tokenX as Address).toLowerCase(),
        tokenY: (tokenY as Address).toLowerCase(),
        tokenXSymbol: tokenXInfo.symbol,
        tokenYSymbol: tokenYInfo.symbol,
        tokenXDecimals: tokenXInfo.decimals,
        tokenYDecimals: tokenYInfo.decimals,
        binStep: Number(binStep),
        activeId: Number(activeId),
        reserveX: (reserves as any)[0].toString(),
        reserveY: (reserves as any)[1].toString(),
        protocolFeeX: (protocolFees as any)[0].toString(),
        protocolFeeY: (protocolFees as any)[1].toString(),
        totalSupply: totalSupply.toString(),
        lastUpdated: new Date(),
        // 计算流动性USD价值（这里用简化的计算）
        liquidityUsd: this.calculateLiquidityUSD(
          (reserves as any)[0],
          (reserves as any)[1],
          tokenXInfo.decimals,
          tokenYInfo.decimals
        )
      };

    } catch (error) {
      console.warn(`获取池 ${poolAddress} 信息失败:`, error);
      throw error;
    }
  }

  /**
   * 通过合约获取代币信息
   */
  private async getTokenInfoFromContract(chain: string, tokenAddress: Address): Promise<{
    symbol: string;
    decimals: number;
    name: string;
  }> {
    const client = this.clients.get(chain);
    
    if (!client) {
      throw new Error(`Chain ${chain} not configured`);
    }

    try {
      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      };
    } catch (error) {
      console.warn(`获取代币 ${tokenAddress} 信息失败:`, error);
      // 返回默认值
      return {
        name: 'Unknown',
        symbol: 'UNK',
        decimals: 18,
      };
    }
  }

  /**
   * 通过合约计算总供应量
   */
  private async calculateTotalSupplyFromContract(
    chain: string,
    poolAddress: Address,
    activeId: number
  ): Promise<bigint> {
    const client = this.clients.get(chain);
    
    if (!client) {
      return 0n;
    }

    try {
      // 获取活跃bin周围的供应量
      const binIds = [];
      const range = 5; // 检查活跃bin周围5个bin（减少请求数量）
      
      for (let i = activeId - range; i <= activeId + range; i++) {
        if (i >= 0) {
          binIds.push(BigInt(i));
        }
      }

      const supplies = await Promise.all(
        binIds.map(id => 
          client.readContract({
            address: poolAddress,
            abi: LB_PAIR_ABI,
            functionName: 'totalSupply',
            args: [id]
          }).catch(() => 0n)
        )
      );

      return supplies.reduce((total, supply) => total + (supply as bigint), 0n);
    } catch (error) {
      console.warn('计算总供应量失败:', error);
      return 0n;
    }
  }

  /**
   * 简化的流动性USD计算
   */
  private calculateLiquidityUSD(
    reserveX: bigint,
    reserveY: bigint,
    decimalsX: number,
    decimalsY: number
  ): number {
    try {
      // 这里使用简化的计算，假设代币价格为1USD
      // 实际应用中应该集成价格预言机
      const valueX = Number(formatUnits(reserveX, decimalsX));
      const valueY = Number(formatUnits(reserveY, decimalsY));
      return valueX + valueY;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 同步所有池的信息到数据库
   */
  async syncAllPools(chain: string): Promise<{
    discovered: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
      console.log(`🚀 开始同步 ${chain} 链的所有池...`);

      // 1. 发现所有池
      const poolAddresses = await this.discoverPoolsFromFactory(chain);
      console.log(`📦 发现 ${poolAddresses.length} 个池`);

      // 2. 批量同步池信息
      const batchSize = 5; // 减少并发数量避免RPC限制
      
      for (let i = 0; i < poolAddresses.length; i += batchSize) {
        const batch = poolAddresses.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (poolAddress) => {
          try {
            const poolInfo = await this.getPoolInfoFromContract(chain, poolAddress);
            
            // 保存到数据库
            await this.db.insert(schema.pools).values(poolInfo).onConflictDoUpdate({
              target: [schema.pools.address, schema.pools.chain],
              set: {
                reserveX: poolInfo.reserveX,
                reserveY: poolInfo.reserveY,
                activeId: poolInfo.activeId,
                totalSupply: poolInfo.totalSupply,
                liquidityUsd: poolInfo.liquidityUsd,
                lastUpdated: poolInfo.lastUpdated,
              }
            });

            synced++;
            return { success: true, address: poolAddress };
          } catch (error) {
            failed++;
            const errorMsg = `池 ${poolAddress}: ${error instanceof Error ? error.message : '未知错误'}`;
            errors.push(errorMsg);
            console.warn(errorMsg);
            return { success: false, address: poolAddress, error };
          }
        });

        await Promise.all(batchPromises);
        
        console.log(`📊 进度: ${Math.min(i + batchSize, poolAddresses.length)}/${poolAddresses.length} (成功: ${synced}, 失败: ${failed})`);
        
        // 批次间暂停，避免请求过快
        if (i + batchSize < poolAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ 同步完成! 用时: ${duration}ms`);
      console.log(`📈 统计: 发现 ${poolAddresses.length}, 成功 ${synced}, 失败 ${failed}`);

      return {
        discovered: poolAddresses.length,
        synced,
        failed,
        errors
      };

    } catch (error) {
      console.error(`❌ 同步失败:`, error);
      throw error;
    }
  }

  /**
   * 获取特定池的实时信息
   */
  async getPoolRealTimeInfo(chain: string, poolAddress: Address): Promise<any> {
    try {
      const poolInfo = await this.getPoolInfoFromContract(chain, poolAddress);
      
      // 同时更新数据库
      await this.db.insert(schema.pools).values(poolInfo).onConflictDoUpdate({
        target: [schema.pools.address, schema.pools.chain],
        set: {
          reserveX: poolInfo.reserveX,
          reserveY: poolInfo.reserveY,
          activeId: poolInfo.activeId,
          totalSupply: poolInfo.totalSupply,
          liquidityUsd: poolInfo.liquidityUsd,
          lastUpdated: poolInfo.lastUpdated,
        }
      });

      return poolInfo;
    } catch (error) {
      console.error(`获取池 ${poolAddress} 实时信息失败:`, error);
      throw error;
    }
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(chain: string): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    blockNumber?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const client = this.clients.get(chain);

    if (!client) {
      return {
        status: 'unhealthy',
        latency: 0,
        error: `Chain ${chain} not configured`
      };
    }

    try {
      const blockNumber = await client.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        blockNumber: Number(blockNumber)
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

/**
 * 创建合约同步服务实例
 */
export function createContractSyncService(db: DrizzleD1Database<typeof schema>): ContractSyncService {
  return new ContractSyncService(db);
}
