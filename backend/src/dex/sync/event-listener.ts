import { createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem';
import type { Address, Log } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gt, max } from 'drizzle-orm';
import * as schema from '../../database/schema';
import type { Env } from '../../index';

// Trader Joe LiquiBook事件ABI
const TRADER_JOE_EVENTS = {
  // Swap事件
  Swap: parseAbiItem('event Swap(address indexed sender, address indexed to, uint24 indexed id, bytes32 amountsIn, bytes32 amountsOut, uint24 volatilityAccumulator, bytes32 totalFees, bytes32 protocolFees)'),
  
  // 流动性添加事件
  DepositedToBins: parseAbiItem('event DepositedToBins(address indexed sender, address indexed to, uint256[] ids, bytes32[] amounts)'),
  
  // 流动性移除事件
  WithdrawnFromBins: parseAbiItem('event WithdrawnFromBins(address indexed sender, address indexed to, uint256[] ids, bytes32[] amounts)'),
  
  // 池创建事件
  LBPairCreated: parseAbiItem('event LBPairCreated(address indexed tokenX, address indexed tokenY, uint256 indexed binStep, address LBPair, uint256 pid)'),
  
  // 流动性变化事件
  CompositionFees: parseAbiItem('event CompositionFees(address indexed sender, address indexed to, uint256[] ids, bytes32[] fees)'),
  
  // 价格变化事件
  OracleLengthIncreased: parseAbiItem('event OracleLengthIncreased(uint256 previousLength, uint256 newLength)')
};

export interface SyncProgress {
  chain: string;
  contractAddress: string;
  eventType: string;
  lastBlockNumber: bigint;
  lastLogIndex: number;
}

export interface ParsedSwapEvent {
  txHash: string;
  poolAddress: string;
  chain: string;
  sender: string;
  to: string;
  binId: number;
  amountsIn: string;
  amountsOut: string;
  totalFees: string;
  blockNumber: bigint;
  logIndex: number;
  timestamp: number;
}

export interface ParsedLiquidityEvent {
  txHash: string;
  poolAddress: string;
  chain: string;
  user: string;
  to: string;
  eventType: 'deposit' | 'withdraw';
  binIds: number[];
  amounts: string[];
  blockNumber: bigint;
  logIndex: number;
  timestamp: number;
}

export class EventListener {
  private db: ReturnType<typeof drizzle>;
  private publicClient: any;
  private chain: string;
  
  constructor(env: Env, chain: 'bsc' | 'bsc-testnet') {
    this.db = drizzle(env.D1_DATABASE!, { schema });
    this.chain = chain;
    
    // 创建公共客户端
    const rpcUrl = chain === 'bsc' ? env.BSC_INFURA_URL : env.BSC_TEST_INFURA_URL;
    const chainConfig = chain === 'bsc' ? bsc : bscTestnet;
    
    if (!rpcUrl) {
      throw new Error(`RPC URL not configured for chain: ${chain}`);
    }
    
    this.publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(rpcUrl)
    });
  }

  /**
   * 获取指定合约的同步进度
   */
  async getSyncProgress(contractAddress: string, eventType: string): Promise<SyncProgress | null> {
    try {
      const result = await this.db
        .select()
        .from(schema.syncStatus)
        .where(
          and(
            eq(schema.syncStatus.chain, this.chain),
            eq(schema.syncStatus.contractAddress, contractAddress.toLowerCase()),
            eq(schema.syncStatus.eventType, eventType)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const record = result[0];
      if (!record) {
        return null;
      }

      return {
        chain: record.chain,
        contractAddress: record.contractAddress,
        eventType: record.eventType,
        lastBlockNumber: BigInt(record.lastBlockNumber),
        lastLogIndex: record.lastLogIndex
      };
    } catch (error) {
      console.error('Failed to get sync progress:', error);
      return null;
    }
  }

  /**
   * 更新同步进度
   */
  async updateSyncProgress(
    contractAddress: string,
    eventType: string,
    blockNumber: bigint,
    logIndex: number
  ): Promise<void> {
    try {
      const now = Date.now();
      
      // 尝试更新现有记录
      const existing = await this.db
        .select()
        .from(schema.syncStatus)
        .where(
          and(
            eq(schema.syncStatus.chain, this.chain),
            eq(schema.syncStatus.contractAddress, contractAddress.toLowerCase()),
            eq(schema.syncStatus.eventType, eventType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await this.db
          .update(schema.syncStatus)
          .set({
            lastBlockNumber: Number(blockNumber),
            lastLogIndex: logIndex,
            updatedAt: new Date(now)
          })
          .where(eq(schema.syncStatus.id, existing[0]!.id));
      } else {
        // 创建新记录
        await this.db.insert(schema.syncStatus).values({
          chain: this.chain,
          contractAddress: contractAddress.toLowerCase(),
          eventType,
          lastBlockNumber: Number(blockNumber),
          lastLogIndex: logIndex,
          updatedAt: new Date(now)
        });
      }
    } catch (error) {
      console.error('Failed to update sync progress:', error);
      throw error;
    }
  }

  /**
   * 监听Swap事件
   */
  async listenToSwapEvents(
    poolAddress: string,
    fromBlock?: bigint,
    toBlock?: bigint
  ): Promise<ParsedSwapEvent[]> {
    try {
      console.log(`Listening to Swap events for pool ${poolAddress} from block ${fromBlock} to ${toBlock}`);
      
      const logs = await this.publicClient.getLogs({
        address: poolAddress as Address,
        event: TRADER_JOE_EVENTS.Swap,
        fromBlock: fromBlock || 'earliest',
        toBlock: toBlock || 'latest'
      });

      const parsedEvents: ParsedSwapEvent[] = [];

      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: [TRADER_JOE_EVENTS.Swap],
            data: log.data,
            topics: log.topics
          });

          // 获取区块信息以获取时间戳
          const block = await this.publicClient.getBlock({ blockHash: log.blockHash });
          
          const parsedEvent: ParsedSwapEvent = {
            txHash: log.transactionHash!,
            poolAddress: poolAddress.toLowerCase(),
            chain: this.chain,
            sender: (decoded.args as any).sender,
            to: (decoded.args as any).to,
            binId: Number((decoded.args as any).id),
            amountsIn: (decoded.args as any).amountsIn,
            amountsOut: (decoded.args as any).amountsOut,
            totalFees: (decoded.args as any).totalFees,
            blockNumber: log.blockNumber!,
            logIndex: log.logIndex!,
            timestamp: Number(block.timestamp) * 1000
          };

          parsedEvents.push(parsedEvent);
        } catch (decodeError) {
          console.error('Failed to decode swap event:', decodeError);
          continue;
        }
      }

      console.log(`Found ${parsedEvents.length} swap events`);
      return parsedEvents;
    } catch (error) {
      console.error('Failed to listen to swap events:', error);
      throw error;
    }
  }

  /**
   * 监听流动性事件（存入和提取）
   */
  async listenToLiquidityEvents(
    poolAddress: string,
    fromBlock?: bigint,
    toBlock?: bigint
  ): Promise<ParsedLiquidityEvent[]> {
    try {
      console.log(`Listening to Liquidity events for pool ${poolAddress} from block ${fromBlock} to ${toBlock}`);
      
      // 获取存入事件
      const depositLogs = await this.publicClient.getLogs({
        address: poolAddress as Address,
        event: TRADER_JOE_EVENTS.DepositedToBins,
        fromBlock: fromBlock || 'earliest',
        toBlock: toBlock || 'latest'
      });

      // 获取提取事件
      const withdrawLogs = await this.publicClient.getLogs({
        address: poolAddress as Address,
        event: TRADER_JOE_EVENTS.WithdrawnFromBins,
        fromBlock: fromBlock || 'earliest',
        toBlock: toBlock || 'latest'
      });

      const parsedEvents: ParsedLiquidityEvent[] = [];

      // 处理存入事件
      for (const log of depositLogs) {
        try {
          const decoded = decodeEventLog({
            abi: [TRADER_JOE_EVENTS.DepositedToBins],
            data: log.data,
            topics: log.topics
          });

          const block = await this.publicClient.getBlock({ blockHash: log.blockHash });
          
          const parsedEvent: ParsedLiquidityEvent = {
            txHash: log.transactionHash!,
            poolAddress: poolAddress.toLowerCase(),
            chain: this.chain,
            user: (decoded.args as any).sender,
            to: (decoded.args as any).to,
            eventType: 'deposit',
            binIds: (decoded.args as any).ids.map((id: bigint) => Number(id)),
            amounts: (decoded.args as any).amounts,
            blockNumber: log.blockNumber!,
            logIndex: log.logIndex!,
            timestamp: Number(block.timestamp) * 1000
          };

          parsedEvents.push(parsedEvent);
        } catch (decodeError) {
          console.error('Failed to decode deposit event:', decodeError);
          continue;
        }
      }

      // 处理提取事件
      for (const log of withdrawLogs) {
        try {
          const decoded = decodeEventLog({
            abi: [TRADER_JOE_EVENTS.WithdrawnFromBins],
            data: log.data,
            topics: log.topics
          });

          const block = await this.publicClient.getBlock({ blockHash: log.blockHash });
          
          const parsedEvent: ParsedLiquidityEvent = {
            txHash: log.transactionHash!,
            poolAddress: poolAddress.toLowerCase(),
            chain: this.chain,
            user: (decoded.args as any).sender,
            to: (decoded.args as any).to,
            eventType: 'withdraw',
            binIds: (decoded.args as any).ids.map((id: bigint) => Number(id)),
            amounts: (decoded.args as any).amounts,
            blockNumber: log.blockNumber!,
            logIndex: log.logIndex!,
            timestamp: Number(block.timestamp) * 1000
          };

          parsedEvents.push(parsedEvent);
        } catch (decodeError) {
          console.error('Failed to decode withdraw event:', decodeError);
          continue;
        }
      }

      // 按区块号和日志索引排序
      parsedEvents.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return Number(a.blockNumber - b.blockNumber);
        }
        return a.logIndex - b.logIndex;
      });

      console.log(`Found ${parsedEvents.length} liquidity events`);
      return parsedEvents;
    } catch (error) {
      console.error('Failed to listen to liquidity events:', error);
      throw error;
    }
  }

  /**
   * 批量同步指定区块范围的事件
   */
  async syncEventsBatch(
    poolAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
    batchSize: bigint = 100n
  ): Promise<void> {
    try {
      console.log(`🔄 Starting batch sync for pool ${poolAddress} from ${fromBlock} to ${toBlock} (${toBlock - fromBlock + 1n} blocks)`);
      
      let currentFromBlock = fromBlock;
      let totalSwapEvents = 0;
      let totalLiquidityEvents = 0;
      
      while (currentFromBlock <= toBlock) {
        const currentToBlock = currentFromBlock + batchSize > toBlock 
          ? toBlock 
          : currentFromBlock + batchSize;

        console.log(`📦 Syncing batch: ${currentFromBlock} to ${currentToBlock} (${currentToBlock - currentFromBlock + 1n} blocks)`);

        try {
          // 同步Swap事件
          const swapEvents = await this.listenToSwapEvents(
            poolAddress,
            currentFromBlock,
            currentToBlock
          );

          // 同步流动性事件
          const liquidityEvents = await this.listenToLiquidityEvents(
            poolAddress,
            currentFromBlock,
            currentToBlock
          );

          console.log(`📊 Found ${swapEvents.length} swap events and ${liquidityEvents.length} liquidity events in batch`);

          // 保存事件到数据库
          if (swapEvents.length > 0) {
            console.log(`💾 Saving ${swapEvents.length} swap events to database...`);
            await this.saveSwapEvents(swapEvents);
            totalSwapEvents += swapEvents.length;
            console.log(`✅ Successfully saved ${swapEvents.length} swap events`);
          }

          if (liquidityEvents.length > 0) {
            console.log(`💾 Saving ${liquidityEvents.length} liquidity events to database...`);
            await this.saveLiquidityEvents(liquidityEvents);
            totalLiquidityEvents += liquidityEvents.length;
            console.log(`✅ Successfully saved ${liquidityEvents.length} liquidity events`);
          }

          // 更新同步进度
          console.log(`📈 Updating sync progress to block ${currentToBlock}...`);
          await this.updateSyncProgress(
            poolAddress,
            'swap',
            currentToBlock,
            0
          );

          await this.updateSyncProgress(
            poolAddress,
            'liquidity',
            currentToBlock,
            0
          );
          console.log(`✅ Sync progress updated to block ${currentToBlock}`);

        } catch (batchError) {
          console.error(`❌ Failed to process batch ${currentFromBlock}-${currentToBlock}:`, batchError);
          
          // 检查是否是数据库错误
          if (batchError instanceof Error && batchError.message.includes('database')) {
            console.error(`🗄️  Database error in batch processing - this will cause missing data`);
          }
          
          // 对于批次错误，我们仍然更新进度以避免重复处理相同区块
          await this.updateSyncProgress(
            poolAddress,
            'swap',
            currentToBlock,
            0
          ).catch(progressError => {
            console.error(`❌ Failed to update progress after batch error:`, progressError);
          });
        }

        currentFromBlock = currentToBlock + 1n;
        
        // 添加小延迟避免RPC限制
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Batch sync completed for pool ${poolAddress}`);
      console.log(`📊 Total events saved: ${totalSwapEvents} swap events, ${totalLiquidityEvents} liquidity events`);
      
      if (totalSwapEvents === 0 && totalLiquidityEvents === 0) {
        console.warn(`⚠️  No events found for pool ${poolAddress} in ${toBlock - fromBlock + 1n} blocks. This could indicate:
          1. Pool has no activity in this block range
          2. Incorrect pool address
          3. RPC connection issues
          4. Event signature mismatch`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to sync events batch for pool ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * 保存Swap事件到数据库
   */
  private async saveSwapEvents(events: ParsedSwapEvent[]): Promise<void> {
    if (events.length === 0) {
      console.log(`ℹ️  No swap events to save`);
      return;
    }

    try {
      console.log(`💾 Preparing to save ${events.length} swap events to database...`);
      
      // 批量插入swap事件
      const swapRecords = events.map(event => ({
        txHash: event.txHash,
        poolAddress: event.poolAddress,
        chain: event.chain,
        sender: event.sender,
        to: event.to,
        tokenInAddress: '', // 需要从池信息中获取
        tokenOutAddress: '', // 需要从池信息中获取
        amountIn: event.amountsIn,
        amountOut: event.amountsOut,
        fees: event.totalFees,
        blockNumber: Number(event.blockNumber),
        logIndex: event.logIndex,
        timestamp: new Date(event.timestamp)
      }));

      console.log(`🔗 Sample swap event data:`, {
        txHash: swapRecords[0]?.txHash,
        poolAddress: swapRecords[0]?.poolAddress,
        chain: swapRecords[0]?.chain,
        blockNumber: swapRecords[0]?.blockNumber,
        timestamp: swapRecords[0]?.timestamp
      });

      await this.db.insert(schema.swapEvents).values(swapRecords);
      console.log(`✅ Successfully saved ${swapRecords.length} swap events to database`);
      
    } catch (error) {
      console.error(`❌ Failed to save ${events.length} swap events to database:`, error);
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint')) {
          console.error(`🔄 Duplicate event detected - some events may have been already processed`);
        } else if (error.message.includes('database')) {
          console.error(`🗄️  Database connection or schema issue`);
        } else if (error.message.includes('permission')) {
          console.error(`🔒 Database permission issue`);
        }
      }
      
      throw error;
    }
  }

  /**
   * 保存流动性事件到数据库
   */
  private async saveLiquidityEvents(events: ParsedLiquidityEvent[]): Promise<void> {
    if (events.length === 0) {
      console.log(`ℹ️  No liquidity events to save`);
      return;
    }

    try {
      console.log(`💾 Preparing to save ${events.length} liquidity events to database...`);
      
      const liquidityRecords = events.map(event => ({
        txHash: event.txHash,
        poolAddress: event.poolAddress,
        chain: event.chain,
        user: event.user,
        eventType: event.eventType,
        binIds: JSON.stringify(event.binIds),
        amounts: JSON.stringify(event.amounts),
        liquidity: '0', // 需要计算
        blockNumber: Number(event.blockNumber),
        logIndex: event.logIndex,
        timestamp: new Date(event.timestamp)
      }));

      console.log(`🔗 Sample liquidity event data:`, {
        txHash: liquidityRecords[0]?.txHash,
        poolAddress: liquidityRecords[0]?.poolAddress,
        chain: liquidityRecords[0]?.chain,
        eventType: liquidityRecords[0]?.eventType,
        blockNumber: liquidityRecords[0]?.blockNumber,
        timestamp: liquidityRecords[0]?.timestamp
      });

      await this.db.insert(schema.liquidityEvents).values(liquidityRecords);
      console.log(`✅ Successfully saved ${liquidityRecords.length} liquidity events to database`);
      
    } catch (error) {
      console.error(`❌ Failed to save ${events.length} liquidity events to database:`, error);
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint')) {
          console.error(`🔄 Duplicate event detected - some events may have been already processed`);
        } else if (error.message.includes('database')) {
          console.error(`🗄️  Database connection or schema issue`);
        } else if (error.message.includes('permission')) {
          console.error(`🔒 Database permission issue`);
        }
      }
      
      throw error;
    }
  }

  /**
   * 获取最新区块号
   */
  async getLatestBlockNumber(): Promise<bigint> {
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.error('Failed to get latest block number:', error);
      throw error;
    }
  }

  /**
   * 增量同步：从上次同步点继续同步
   */
  /**
   * 获取合约创建区块号（优先LBPairCreated事件，否则二分查找有code区块）
   */
  async getContractCreationBlock(contractAddress: string): Promise<bigint> {
    try {
      // 优先查LBPairCreated事件
      const txList = await this.publicClient.getLogs({
        address: contractAddress as Address,
        fromBlock: 0n,
        toBlock: 'latest',
        event: TRADER_JOE_EVENTS.LBPairCreated,
      });
      if (txList.length > 0) {
        return txList[0].blockNumber!;
      }
      // 没有LBPairCreated事件则二分查找有code区块
      let low = 0n;
      let high = await this.getLatestBlockNumber();
      let creationBlock = high;
      while (low <= high) {
        const mid = (low + high) / 2n;
        const code = await this.publicClient.getBytecode({ address: contractAddress as Address, blockNumber: mid });
        if (code && code !== '0x') {
          creationBlock = mid;
          high = mid - 1n;
        } else {
          low = mid + 1n;
        }
      }
      return creationBlock;
    } catch (error) {
      console.error('Failed to get contract creation block:', error);
      // fallback: 回溯10000区块
      return (await this.getLatestBlockNumber()) - 10000n;
    }
  }

  /**
   * 增量同步：从上次同步点继续同步（首次自动从合约创建区块）
   */
  async incrementalSync(poolAddress: string): Promise<void> {
    try {
      console.log(`🚀 Starting incremental sync for pool ${poolAddress} on ${this.chain}`);
      
      const latestBlock = await this.getLatestBlockNumber();
      console.log(`📊 Latest block number: ${latestBlock}`);
      
      // 获取Swap事件的同步进度
      const swapProgress = await this.getSyncProgress(poolAddress, 'swap');
      let startBlock: bigint;
      
      if (swapProgress) {
        startBlock = swapProgress.lastBlockNumber + 1n;
        console.log(`📈 Found existing sync progress - resuming from block ${startBlock}`);
      } else {
        startBlock = await this.getContractCreationBlock(poolAddress);
        console.log(`🆕 No existing sync progress - starting from contract creation block ${startBlock}`);
      }
      
      if (startBlock <= latestBlock) {
        const blocksToSync = latestBlock - startBlock + 1n;
        console.log(`🔄 Syncing ${blocksToSync} blocks (${startBlock} to ${latestBlock}) for pool ${poolAddress}`);
        
        await this.syncEventsBatch(poolAddress, startBlock, latestBlock);
        
        console.log(`✅ Incremental sync completed for pool ${poolAddress}`);
      } else {
        console.log(`ℹ️  Pool ${poolAddress} is already up to date (start: ${startBlock}, latest: ${latestBlock})`);
      }
    } catch (error) {
      console.error(`❌ Failed to perform incremental sync for pool ${poolAddress}:`, error);
      throw error;
    }
  }
}

export { TRADER_JOE_EVENTS };
