import { createPublicClient, http, parseAbi } from 'viem';
import type { Address } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import type { Env } from '../../index';
import type { PoolStatsData } from './database-service';

// Trader Joe LiquiBook合约ABI
const LB_PAIR_ABI = parseAbi([
  'function getReserves() external view returns (uint128 reserveX, uint128 reserveY)',
  'function getActiveId() external view returns (uint24)',
  'function totalSupply(uint256 id) external view returns (uint256)',
  'function getBin(uint24 id) external view returns (uint128 binReserveX, uint128 binReserveY)',
  'function getTokenX() external view returns (address)',
  'function getTokenY() external view returns (address)',
  'function getBinStep() external view returns (uint16)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)'
]);

const ERC20_ABI = parseAbi([
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)'
]);

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

export interface BinInfo {
  id: number;
  reserveX: string;
  reserveY: string;
  totalSupply: string;
  priceX: number;
  priceY: number;
}

export interface UserPosition {
  userAddress: string;
  poolAddress: string;
  chain: string;
  binId: number;
  liquidity: string;
  liquidityUsd?: number;
}

export interface PoolReserves {
  reserveX: string;
  reserveY: string;
  activeBinId: number;
}

export class OnChainService {
  private publicClients: Map<string, any> = new Map();
  
  constructor(private env: Env) {
    // 初始化BSC客户端
    if (env.BSC_RPC_URL) {
      this.publicClients.set('bsc', createPublicClient({
        chain: bsc,
        transport: http(env.BSC_RPC_URL)
      }));
    }
    
    // 初始化BSC测试网客户端
    if (env.BSCTEST_RPC_URL) {
      this.publicClients.set('bsc-testnet', createPublicClient({
        chain: bscTestnet,
        transport: http(env.BSCTEST_RPC_URL)
      }));
    }
  }

  /**
   * 获取公共客户端
   */
  private getPublicClient(chain: string) {
    const client = this.publicClients.get(chain);
    if (!client) {
      throw new Error(`Public client not configured for chain: ${chain}`);
    }
    return client;
  }

  /**
   * 获取代币信息
   */
  async getTokenInfo(tokenAddress: string, chain: string): Promise<TokenInfo> {
    try {
      const client = this.getPublicClient(chain);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'name'
        }),
        client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'decimals'
        }),
        client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'totalSupply'
        }).catch(() => null) // totalSupply可能不存在
      ]);

      return {
        address: tokenAddress.toLowerCase(),
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: totalSupply ? totalSupply.toString() : undefined
      };
    } catch (error) {
      console.error(`Failed to get token info for ${tokenAddress} on ${chain}:`, error);
      throw error;
    }
  }

  /**
   * 获取池的储备量信息
   */
  async getPoolReserves(poolAddress: string, chain: string): Promise<PoolReserves> {
    try {
      const client = this.getPublicClient(chain);
      
      const [reserves, activeId] = await Promise.all([
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getReserves'
        }),
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getActiveId'
        })
      ]);

      return {
        reserveX: (reserves as any)[0].toString(),
        reserveY: (reserves as any)[1].toString(),
        activeBinId: Number(activeId)
      };
    } catch (error) {
      console.error(`Failed to get pool reserves for ${poolAddress} on ${chain}:`, error);
      throw error;
    }
  }

  /**
   * 获取池的详细统计数据
   */
  async getPoolStats(poolAddress: string, chain: string): Promise<PoolStatsData | null> {
    try {
      const client = this.getPublicClient(chain);
      const blockNumber = await client.getBlockNumber();
      const block = await client.getBlock({ blockNumber });
      
      // 获取基础池信息
      const [reserves, activeId, tokenX, tokenY, binStep] = await Promise.all([
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getReserves'
        }),
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getActiveId'
        }),
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getTokenX'
        }),
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getTokenY'
        }),
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getBinStep'
        })
      ]);

      // 获取活跃bin的总供应量
      const activeBinTotalSupply = await client.readContract({
        address: poolAddress as Address,
        abi: LB_PAIR_ABI,
        functionName: 'totalSupply',
        args: [activeId]
      });

      // 获取代币信息用于计算USD价值
      const [tokenXInfo, tokenYInfo] = await Promise.all([
        this.getTokenInfo(tokenX as string, chain).catch(() => null),
        this.getTokenInfo(tokenY as string, chain).catch(() => null)
      ]);

      // 计算流动性USD价值（这里需要价格数据，暂时设为0）
      const liquidityUsd = 0; // 需要从价格服务获取

      return {
        poolAddress: poolAddress.toLowerCase(),
        chain,
        reserveX: (reserves as any)[0].toString(),
        reserveY: (reserves as any)[1].toString(),
        activeBinId: Number(activeId),
        totalSupply: activeBinTotalSupply.toString(),
        liquidityUsd,
        volume24h: 0, // 需要从事件计算
        volume7d: 0,   // 需要从事件计算
        fees24h: 0,    // 需要从事件计算
        apy: 0,        // 需要计算
        blockNumber: Number(blockNumber),
        timestamp: Number(block.timestamp) * 1000
      };
    } catch (error) {
      console.error(`Failed to get pool stats for ${poolAddress} on ${chain}:`, error);
      return null;
    }
  }

  /**
   * 获取指定bin的信息
   */
  async getBinInfo(poolAddress: string, binId: number, chain: string): Promise<BinInfo | null> {
    try {
      const client = this.getPublicClient(chain);
      
      const [binData, totalSupply] = await Promise.all([
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getBin',
          args: [binId]
        }),
        client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'totalSupply',
          args: [binId]
        })
      ]);

      const reserveX = (binData as any)[0].toString();
      const reserveY = (binData as any)[1].toString();
      
      // 计算价格（简化版本）
      const priceX = Number(reserveY) / Math.max(Number(reserveX), 1);
      const priceY = Number(reserveX) / Math.max(Number(reserveY), 1);

      return {
        id: binId,
        reserveX,
        reserveY,
        totalSupply: totalSupply.toString(),
        priceX,
        priceY
      };
    } catch (error) {
      console.error(`Failed to get bin info for ${poolAddress} bin ${binId} on ${chain}:`, error);
      return null;
    }
  }

  /**
   * 获取用户在指定池中的仓位
   */
  async getUserPositionsInPool(
    userAddress: string,
    poolAddress: string,
    chain: string,
    binIds?: number[]
  ): Promise<UserPosition[]> {
    try {
      const client = this.getPublicClient(chain);
      const positions: UserPosition[] = [];

      // 如果没有指定binIds，获取活跃bin周围的bins
      if (!binIds) {
        const activeId = await client.readContract({
          address: poolAddress as Address,
          abi: LB_PAIR_ABI,
          functionName: 'getActiveId'
        });
        
        // 检查活跃bin周围±50个bin
        binIds = [];
        const activeIdNum = Number(activeId);
        for (let i = activeIdNum - 50; i <= activeIdNum + 50; i++) {
          if (i >= 0) {
            binIds.push(i);
          }
        }
      }

      // 批量查询用户余额
      const accounts = new Array(binIds.length).fill(userAddress);
      const balances = await client.readContract({
        address: poolAddress as Address,
        abi: LB_PAIR_ABI,
        functionName: 'balanceOfBatch',
        args: [accounts, binIds]
      });

      // 处理非零余额
      for (let i = 0; i < binIds.length; i++) {
        const balance = balances[i];
        const binId = binIds[i];
        if (balance && balance > 0n && binId !== undefined) {
          positions.push({
            userAddress: userAddress.toLowerCase(),
            poolAddress: poolAddress.toLowerCase(),
            chain,
            binId: binId,
            liquidity: balance.toString(),
            liquidityUsd: 0 // 需要计算USD价值
          });
        }
      }

      return positions;
    } catch (error) {
      console.error(`Failed to get user positions for ${userAddress} in ${poolAddress} on ${chain}:`, error);
      return [];
    }
  }

  /**
   * 获取用户在所有池中的仓位
   */
  async getUserPositions(userAddress: string, poolAddresses?: string[]): Promise<UserPosition[]> {
    const allPositions: UserPosition[] = [];

    // 如果没有指定池地址，需要从数据库获取所有池
    if (!poolAddresses) {
      // 这里应该从数据库获取池列表，暂时返回空
      return [];
    }

    for (const [chain, client] of this.publicClients) {
      for (const poolAddress of poolAddresses) {
        try {
          const positions = await this.getUserPositionsInPool(
            userAddress,
            poolAddress,
            chain
          );
          allPositions.push(...positions);
          
          // 添加延迟避免RPC限制
          await this.sleep(100);
        } catch (error) {
          console.error(`Failed to get positions for pool ${poolAddress} on ${chain}:`, error);
          continue;
        }
      }
    }

    return allPositions;
  }

  /**
   * 检查地址是否为有效的合约
   */
  async isContract(address: string, chain: string): Promise<boolean> {
    try {
      const client = this.getPublicClient(chain);
      const code = await client.getBytecode({ address: address as Address });
      return code !== undefined && code !== '0x';
    } catch (error) {
      console.error(`Failed to check if ${address} is contract on ${chain}:`, error);
      return false;
    }
  }

  /**
   * 获取当前区块号
   */
  async getCurrentBlockNumber(chain: string): Promise<bigint> {
    try {
      const client = this.getPublicClient(chain);
      return await client.getBlockNumber();
    } catch (error) {
      console.error(`Failed to get current block number for ${chain}:`, error);
      throw error;
    }
  }

  /**
   * 获取区块信息
   */
  async getBlock(blockNumber: bigint, chain: string): Promise<any> {
    try {
      const client = this.getPublicClient(chain);
      return await client.getBlock({ blockNumber });
    } catch (error) {
      console.error(`Failed to get block ${blockNumber} for ${chain}:`, error);
      throw error;
    }
  }

  /**
   * 批量获取多个池的储备量
   */
  async getBatchPoolReserves(poolAddresses: string[], chain: string): Promise<Map<string, PoolReserves>> {
    const results = new Map<string, PoolReserves>();
    
    // 使用并发控制避免RPC限制
    const batchSize = 5;
    for (let i = 0; i < poolAddresses.length; i += batchSize) {
      const batch = poolAddresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (poolAddress) => {
        try {
          const reserves = await this.getPoolReserves(poolAddress, chain);
          results.set(poolAddress.toLowerCase(), reserves);
        } catch (error) {
          console.error(`Failed to get reserves for ${poolAddress}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // 添加延迟
      if (i + batchSize < poolAddresses.length) {
        await this.sleep(200);
      }
    }

    return results;
  }

  /**
   * 验证池是否存在且有效
   */
  async validatePool(poolAddress: string, chain: string): Promise<boolean> {
    try {
      // 检查是否为合约
      const isContract = await this.isContract(poolAddress, chain);
      if (!isContract) {
        return false;
      }

      // 尝试调用基础函数
      await this.getPoolReserves(poolAddress, chain);
      return true;
    } catch (error) {
      console.error(`Pool validation failed for ${poolAddress} on ${chain}:`, error);
      return false;
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取支持的链列表
   */
  getSupportedChains(): string[] {
    return Array.from(this.publicClients.keys());
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    chains: Record<string, boolean>;
  }> {
    const chainStatus: Record<string, boolean> = {};
    let healthyChains = 0;

    for (const [chain, client] of this.publicClients) {
      try {
        await client.getBlockNumber();
        chainStatus[chain] = true;
        healthyChains++;
      } catch (error) {
        console.error(`Health check failed for chain ${chain}:`, error);
        chainStatus[chain] = false;
      }
    }

    const totalChains = this.publicClients.size;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyChains === totalChains) {
      status = 'healthy';
    } else if (healthyChains > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      chains: chainStatus
    };
  }
}
