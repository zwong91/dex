import { createPublicClient, http, parseAbiItem, type Log, decodeEventLog, formatUnits } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { eq, and, desc, max } from 'drizzle-orm';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

// Trader Joe LiquiBook 合约 ABI 事件
const SWAP_EVENT_ABI = parseAbiItem('event Swap(address indexed sender, address indexed to, uint24 indexed id, bytes32 amountsIn, bytes32 amountsOut, uint24 volatilityAccumulator, bytes32 totalFees, bytes32 protocolFees)');

const DEPOSIT_EVENT_ABI = parseAbiItem('event DepositedToBins(address indexed sender, address indexed to, uint256[] ids, bytes32[] amounts)');

const WITHDRAW_EVENT_ABI = parseAbiItem('event WithdrawnFromBins(address indexed sender, address indexed to, uint256[] ids, bytes32[] amounts)');

interface ChainConfig {
  chain: any;
  rpcUrl: string;
  factoryAddress: string;
  routerAddress: string;
  blocksPerRequest: number;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  'binance': {
    chain: bsc,
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
    factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e',
    routerAddress: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
    blocksPerRequest: 1000
  },
  'bsctest': {
    chain: bscTestnet,
    rpcUrl: process.env.BSCTEST_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e',
    routerAddress: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
    blocksPerRequest: 1000
  }
};

export class FixedEventListener {
  private db: DrizzleD1Database<typeof schema>;
  private chainConfig: ChainConfig;
  private client: any;
  private chainName: string;

  constructor(db: DrizzleD1Database<typeof schema>, chainName: string) {
    this.db = db;
    this.chainName = chainName;
    this.chainConfig = CHAIN_CONFIGS[chainName];
    
    if (!this.chainConfig) {
      throw new Error(`Unsupported chain: ${chainName}`);
    }

    this.client = createPublicClient({
      chain: this.chainConfig.chain,
      transport: http(this.chainConfig.rpcUrl)
    });
  }

  /**
   * 获取最后同步的区块号
   */
  private async getLastSyncedBlock(contractAddress: string, eventType: string): Promise<number> {
    try {
      const result = await this.db
        .select({ lastBlockNumber: schema.syncStatus.lastBlockNumber })
        .from(schema.syncStatus)
        .where(
          and(
            eq(schema.syncStatus.chain, this.chainName),
            eq(schema.syncStatus.contractAddress, contractAddress),
            eq(schema.syncStatus.eventType, eventType)
          )
        )
        .orderBy(desc(schema.syncStatus.updatedAt))
        .limit(1);

      return result[0]?.lastBlockNumber || 0;
    } catch (error) {
      console.error('Error getting last synced block:', error);
      return 0;
    }
  }

  /**
   * 更新同步状态
   */
  private async updateSyncStatus(
    contractAddress: string, 
    eventType: string, 
    blockNumber: number, 
    logIndex: number
  ): Promise<void> {
    try {
      await this.db
        .insert(schema.syncStatus)
        .values({
          chain: this.chainName,
          contractAddress,
          eventType,
          lastBlockNumber: blockNumber,
          lastLogIndex: logIndex,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * 获取池的token地址
   */
  private async getPoolTokens(poolAddress: string): Promise<{ tokenX: string; tokenY: string }> {
    try {
      const pool = await this.db
        .select()
        .from(schema.pools)
        .where(eq(schema.pools.address, poolAddress))
        .limit(1);

      if (pool.length > 0) {
        return {
          tokenX: pool[0].tokenX,
          tokenY: pool[0].tokenY
        };
      }

      // 如果数据库中没有池信息，从链上获取
      const [tokenX, tokenY] = await Promise.all([
        this.client.readContract({
          address: poolAddress as `0x${string}`,
          abi: ['function getTokenX() external view returns (address)'],
          functionName: 'getTokenX'
        }),
        this.client.readContract({
          address: poolAddress as `0x${string}`,
          abi: ['function getTokenY() external view returns (address)'],
          functionName: 'getTokenY'
        })
      ]);

      return {
        tokenX: tokenX as string,
        tokenY: tokenY as string
      };
    } catch (error) {
      console.error('Error getting pool tokens:', error);
      return {
        tokenX: '',
        tokenY: ''
      };
    }
  }

  /**
   * 处理 Swap 事件
   */
  private async processSwapEvents(poolAddress: string, fromBlock: bigint, toBlock: bigint): Promise<void> {
    try {
      const logs = await this.client.getLogs({
        address: poolAddress as `0x${string}`,
        event: SWAP_EVENT_ABI,
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} swap events for pool ${poolAddress}`);

      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: [SWAP_EVENT_ABI],
            data: log.data,
            topics: log.topics
          });

          // 获取交易详情
          const block = await this.client.getBlock({ blockNumber: log.blockNumber });

          // 解析金额数据 (bytes32 需要特殊处理)
          const amountsIn = this.parseBytes32Amounts(decoded.args.amountsIn as string);
          const amountsOut = this.parseBytes32Amounts(decoded.args.amountsOut as string);
          const totalFees = this.parseBytes32Amounts(decoded.args.totalFees as string);

          // 获取池的token信息
          const poolData = await this.getPoolTokens(poolAddress);
          
          await this.db.insert(schema.swapEvents).values({
            txHash: log.transactionHash,
            poolAddress: poolAddress,
            chain: this.chainName,
            sender: decoded.args.sender as string,
            to: decoded.args.to as string,
            tokenInAddress: poolData.tokenX,
            tokenOutAddress: poolData.tokenY,
            amountIn: amountsIn.tokenX.toString(),
            amountOut: amountsOut.tokenY.toString(),
            amountInUsd: 0, // 需要计算USD价值
            amountOutUsd: 0, // 需要计算USD价值
            fees: totalFees.tokenX.toString(),
            blockNumber: Number(log.blockNumber),
            logIndex: log.logIndex || 0,
            timestamp: new Date(Number(block.timestamp) * 1000)
          });

          await this.updateSyncStatus(poolAddress, 'swap', Number(log.blockNumber), log.logIndex || 0);
        } catch (error) {
          console.error('Error processing swap event:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching swap events:', error);
    }
  }

  /**
   * 处理流动性存入事件
   */
  private async processDepositEvents(poolAddress: string, fromBlock: bigint, toBlock: bigint): Promise<void> {
    try {
      const logs = await this.client.getLogs({
        address: poolAddress as `0x${string}`,
        event: DEPOSIT_EVENT_ABI,
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} deposit events for pool ${poolAddress}`);

      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: [DEPOSIT_EVENT_ABI],
            data: log.data,
            topics: log.topics
          });

          const block = await this.client.getBlock({ blockNumber: log.blockNumber });

          await this.db.insert(schema.liquidityEvents).values({
            txHash: log.transactionHash,
            poolAddress: poolAddress,
            chain: this.chainName,
            user: decoded.args.sender as string,
            eventType: 'deposit',
            binIds: JSON.stringify((decoded.args.ids as readonly bigint[]).map(id => Number(id))),
            amounts: JSON.stringify((decoded.args.amounts as readonly string[]).map(amount => amount.toString())),
            liquidity: '0', // 需要计算
            blockNumber: Number(log.blockNumber),
            logIndex: log.logIndex || 0,
            timestamp: new Date(Number(block.timestamp) * 1000)
          });

          // 更新用户仓位
          await this.updateUserPositions(
            decoded.args.to as string, 
            poolAddress, 
            decoded.args.ids as readonly bigint[], 
            decoded.args.amounts as readonly string[], 
            'add'
          );

          await this.updateSyncStatus(poolAddress, 'deposit', Number(log.blockNumber), log.logIndex || 0);
        } catch (error) {
          console.error('Error processing deposit event:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching deposit events:', error);
    }
  }

  /**
   * 处理流动性提取事件
   */
  private async processWithdrawEvents(poolAddress: string, fromBlock: bigint, toBlock: bigint): Promise<void> {
    try {
      const logs = await this.client.getLogs({
        address: poolAddress as `0x${string}`,
        event: WITHDRAW_EVENT_ABI,
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} withdraw events for pool ${poolAddress}`);

      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: [WITHDRAW_EVENT_ABI],
            data: log.data,
            topics: log.topics
          });

          const block = await this.client.getBlock({ blockNumber: log.blockNumber });

          await this.db.insert(schema.liquidityEvents).values({
            txHash: log.transactionHash,
            poolAddress: poolAddress,
            chain: this.chainName,
            user: decoded.args.sender as string,
            eventType: 'withdraw',
            binIds: JSON.stringify((decoded.args.ids as readonly bigint[]).map(id => Number(id))),
            amounts: JSON.stringify((decoded.args.amounts as readonly string[]).map(amount => amount.toString())),
            liquidity: '0', // 需要计算
            blockNumber: Number(log.blockNumber),
            logIndex: log.logIndex || 0,
            timestamp: new Date(Number(block.timestamp) * 1000)
          });

          // 更新用户仓位
          await this.updateUserPositions(
            decoded.args.to as string, 
            poolAddress, 
            decoded.args.ids as readonly bigint[], 
            decoded.args.amounts as readonly string[], 
            'subtract'
          );

          await this.updateSyncStatus(poolAddress, 'withdraw', Number(log.blockNumber), log.logIndex || 0);
        } catch (error) {
          console.error('Error processing withdraw event:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching withdraw events:', error);
    }
  }

  /**
   * 更新用户仓位
   */
  private async updateUserPositions(
    userAddress: string, 
    poolAddress: string, 
    binIds: readonly bigint[], 
    amounts: readonly string[],
    operation: 'add' | 'subtract'
  ): Promise<void> {
    for (let i = 0; i < binIds.length; i++) {
      const binId = Number(binIds[i]);
      const amount = amounts[i];

      try {
        // 查找现有仓位
        const existingPosition = await this.db
          .select()
          .from(schema.userPositions)
          .where(
            and(
              eq(schema.userPositions.userAddress, userAddress),
              eq(schema.userPositions.poolAddress, poolAddress),
              eq(schema.userPositions.binId, binId)
            )
          )
          .limit(1);

        if (existingPosition.length > 0) {
          // 更新现有仓位
          const currentLiquidity = BigInt(existingPosition[0].liquidity);
          const amountBigInt = BigInt(amount);
          const newLiquidity = operation === 'add' 
            ? currentLiquidity + amountBigInt 
            : currentLiquidity - amountBigInt;

          if (newLiquidity <= 0n) {
            // 删除仓位
            await this.db
              .delete(schema.userPositions)
              .where(eq(schema.userPositions.id, existingPosition[0].id));
          } else {
            // 更新仓位
            await this.db
              .update(schema.userPositions)
              .set({
                liquidity: newLiquidity.toString(),
                updatedAt: new Date()
              })
              .where(eq(schema.userPositions.id, existingPosition[0].id));
          }
        } else if (operation === 'add') {
          // 创建新仓位
          await this.db.insert(schema.userPositions).values({
            userAddress,
            poolAddress,
            chain: this.chainName,
            binId,
            liquidity: amount,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating user position:', error);
      }
    }
  }

  /**
   * 解析 bytes32 金额数据
   */
  private parseBytes32Amounts(bytes32Data: string): { tokenX: bigint; tokenY: bigint } {
    // bytes32 包含两个 uint128 值
    const hex = bytes32Data.slice(2); // 移除 0x
    const tokenXHex = hex.slice(0, 32); // 前 128 位
    const tokenYHex = hex.slice(32, 64); // 后 128 位
    
    return {
      tokenX: BigInt('0x' + tokenXHex),
      tokenY: BigInt('0x' + tokenYHex)
    };
  }

  /**
   * 同步指定池的所有事件
   */
  async syncPoolEvents(poolAddress: string): Promise<void> {
    console.log(`Starting sync for pool ${poolAddress} on ${this.chainName}`);

    try {
      const currentBlock = await this.client.getBlockNumber();
      
      // 获取各事件类型的最后同步块
      const lastSwapBlock = await this.getLastSyncedBlock(poolAddress, 'swap');
      const lastDepositBlock = await this.getLastSyncedBlock(poolAddress, 'deposit');
      const lastWithdrawBlock = await this.getLastSyncedBlock(poolAddress, 'withdraw');

      const fromBlock = BigInt(Math.max(lastSwapBlock, lastDepositBlock, lastWithdrawBlock));
      const toBlock = currentBlock;

      if (fromBlock >= toBlock) {
        console.log(`Pool ${poolAddress} is already up to date`);
        return;
      }

      console.log(`Syncing pool ${poolAddress} from block ${fromBlock} to ${toBlock}`);

      // 分批处理大区块范围
      const batchSize = BigInt(this.chainConfig.blocksPerRequest);
      
      for (let start = fromBlock; start < toBlock; start += batchSize) {
        const end = start + batchSize > toBlock ? toBlock : start + batchSize;
        
        console.log(`Processing blocks ${start} to ${end}`);
        
        // 并行处理不同类型的事件
        await Promise.all([
          this.processSwapEvents(poolAddress, start, end),
          this.processDepositEvents(poolAddress, start, end),
          this.processWithdrawEvents(poolAddress, start, end)
        ]);
      }

      console.log(`Completed sync for pool ${poolAddress}`);
    } catch (error) {
      console.error(`Error syncing pool ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * 同步所有已知池的事件
   */
  async syncAllPools(): Promise<void> {
    try {
      const pools = await this.db
        .select()
        .from(schema.pools)
        .where(eq(schema.pools.chain, this.chainName));

      console.log(`Found ${pools.length} pools to sync on ${this.chainName}`);

      for (const pool of pools) {
        await this.syncPoolEvents(pool.address);
      }
    } catch (error) {
      console.error('Error syncing all pools:', error);
      throw error;
    }
  }

  /**
   * 获取最新的池统计数据
   */
  async updatePoolStats(poolAddress: string): Promise<void> {
    try {
      // 从链上获取最新的池状态
      const poolData = await this.getPoolDataFromChain(poolAddress);
      
      // 计算24小时交易量和手续费
      const stats24h = await this.calculate24hStats(poolAddress);
      
      // 获取当前块号
      const currentBlock = await this.client.getBlockNumber();
      
      await this.db.insert(schema.poolStats).values({
        poolAddress,
        chain: this.chainName,
        reserveX: poolData.reserveX.toString(),
        reserveY: poolData.reserveY.toString(),
        activeBinId: poolData.activeBinId,
        totalSupply: poolData.totalSupply.toString(),
        liquidityUsd: stats24h.liquidityUsd,
        volume24h: stats24h.volume24h,
        volume7d: stats24h.volume7d,
        fees24h: stats24h.fees24h,
        apy: stats24h.apy,
        blockNumber: Number(currentBlock),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating pool stats:', error);
    }
  }

  /**
   * 从链上获取池数据
   */
  private async getPoolDataFromChain(poolAddress: string): Promise<any> {
    try {
      const [reserves, activeId] = await Promise.all([
        this.client.readContract({
          address: poolAddress as `0x${string}`,
          abi: ['function getReserves() external view returns (uint128 reserveX, uint128 reserveY)'],
          functionName: 'getReserves'
        }),
        this.client.readContract({
          address: poolAddress as `0x${string}`,
          abi: ['function getActiveId() external view returns (uint24)'],
          functionName: 'getActiveId'
        })
      ]);

      return {
        reserveX: (reserves as any)[0],
        reserveY: (reserves as any)[1],
        activeBinId: activeId,
        totalSupply: BigInt(0) // TODO: 实现总供应量计算
      };
    } catch (error) {
      console.error('Error getting pool data from chain:', error);
      return {
        reserveX: BigInt(0),
        reserveY: BigInt(0),
        activeBinId: 0,
        totalSupply: BigInt(0)
      };
    }
  }

  /**
   * 计算24小时统计数据
   */
  private async calculate24hStats(poolAddress: string): Promise<any> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    try {
      // 计算24小时交易量
      const swaps = await this.db
        .select()
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.poolAddress, poolAddress),
            eq(schema.swapEvents.chain, this.chainName)
          )
        );

      // TODO: 实现具体的统计计算逻辑
      return {
        liquidityUsd: 0,
        volume24h: 0,
        volume7d: 0,
        fees24h: 0,
        apy: 0
      };
    } catch (error) {
      console.error('Error calculating 24h stats:', error);
      return {
        liquidityUsd: 0,
        volume24h: 0,
        volume7d: 0,
        fees24h: 0,
        apy: 0
      };
    }
  }
}

/**
 * 创建事件监听器实例
 */
export function createFixedEventListener(db: DrizzleD1Database<typeof schema>, chainName: string): FixedEventListener {
  return new FixedEventListener(db, chainName);
}
