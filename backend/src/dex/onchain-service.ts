import { createPublicClient, http, parseAbi, getContract, formatUnits, type Address } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';

export interface ChainConfig {
  chain: any;
  rpcUrl: string;
  factoryAddress: Address;
  routerAddress: Address;
  quoterAddress: Address;
  blocksPerHour: number;
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  'binance': {
    chain: bsc,
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e' as Address,
    routerAddress: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30' as Address,
    quoterAddress: '0xfb76e9E7d88E308aB530330eD90e84a952570319' as Address,
    blocksPerHour: 1200 // ~3 seconds per block
  },
  'bsctest': {
    chain: bscTestnet,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e' as Address,
    routerAddress: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30' as Address,
    quoterAddress: '0xfb76e9E7d88E308aB530330eD90e84a952570319' as Address,
    blocksPerHour: 1200 // ~3 seconds per block
  }
};

// Contract ABIs
export const LB_FACTORY_ABI = parseAbi([
  'function getNumberOfLBPairs() external view returns (uint256)',
  'function getLBPairAtIndex(uint256 index) external view returns (address)',
  'function getLBPairInformation(address tokenA, address tokenB, uint256 binStep) external view returns (address lbPair, uint256 binStep)',
  'function getAllBinSteps() external view returns (uint256[])',
]);

export const LB_PAIR_ABI = parseAbi([
  'function getTokenX() external view returns (address)',
  'function getTokenY() external view returns (address)',
  'function getBinStep() external view returns (uint16)',
  'function getActiveId() external view returns (uint24)',
  'function getReserves() external view returns (uint128 reserveX, uint128 reserveY)',
  'function getBin(uint24 id) external view returns (uint128 binReserveX, uint128 binReserveY)',
  'function getNextNonEmptyBin(bool swapForY, uint24 id) external view returns (uint24 nextId)',
  'function getProtocolFees() external view returns (uint128 protocolFeeX, uint128 protocolFeeY)',
  'function getStaticFeeParameters() external view returns (uint16 baseFactor, uint16 filterPeriod, uint16 decayPeriod, uint16 reductionFactor, uint24 variableFeeControl, uint16 protocolShare, uint24 maxVolatilityAccumulator)',
  'function getVariableFeeParameters() external view returns (uint24 volatilityAccumulator, uint24 volatilityReference, uint24 idReference, uint40 timeOfLastUpdate)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) external view returns (uint256[])',
  
  // Events
  'event Swap(address indexed sender, address indexed to, uint24 indexed id, bytes32 amountsIn, bytes32 amountsOut, uint24 volatilityAccumulator, bytes32 totalFees, bytes32 protocolFees)',
  'event DepositedToBins(address indexed sender, address indexed to, uint256[] ids, bytes32[] amounts)',
  'event WithdrawnFromBins(address indexed sender, address indexed to, uint256[] ids, bytes32[] amounts)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
  'event CompositionFees(address indexed sender, address indexed to, uint256[] ids, bytes32[] fees)',
  'event CollectedProtocolFees(address indexed feeRecipient, bytes32 protocolFees)',
  'event FeesCollected(address indexed sender, address indexed recipient, bytes32 totalFees)',
]);

export const ERC20_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
]);

export const LB_ROUTER_ABI = parseAbi([
  'function getSwapIn(address lbPair, uint128 amountOut, bool swapForY) external view returns (uint128 amountIn, uint128 amountOutLeft, uint128 fee)',
  'function getSwapOut(address lbPair, uint128 amountIn, bool swapForY) external view returns (uint128 amountInLeft, uint128 amountOut, uint128 fee)',
]);

export class OnChainService {
  private clients: Map<string, any> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    for (const [name, config] of Object.entries(CHAIN_CONFIGS)) {
      this.clients.set(name, createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl),
      }));
    }
  }

  getClient(chain: string) {
    const client = this.clients.get(chain);
    if (!client) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    return client;
  }

  getConfig(chain: string): ChainConfig {
    const config = CHAIN_CONFIGS[chain];
    if (!config) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    return config;
  }

  async getTokenInfo(chain: string, tokenAddress: Address) {
    const client = this.getClient(chain);
    
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
        address: tokenAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      };
    } catch (error) {
      console.warn(`Failed to fetch token info for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        name: 'Unknown',
        symbol: 'UNK',
        decimals: 18,
      };
    }
  }

  async getPoolData(chain: string, poolAddress: Address) {
    const client = this.getClient(chain);
    
    try {
      const [tokenX, tokenY, binStep, activeId, reserves, protocolFees, staticFees, variableFees] = await Promise.all([
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
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getStaticFeeParameters',
        }),
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'getVariableFeeParameters',
        }),
      ]);

      const [tokenXInfo, tokenYInfo] = await Promise.all([
        this.getTokenInfo(chain, tokenX as Address),
        this.getTokenInfo(chain, tokenY as Address),
      ]);

      const reservesData = reserves as [bigint, bigint];
      const staticFeesData = staticFees as any;
      const protocolFeesData = protocolFees as [bigint, bigint];

      return {
        pairAddress: poolAddress,
        tokenX: tokenXInfo,
        tokenY: tokenYInfo,
        binStep: Number(binStep),
        activeId: Number(activeId),
        reserveX: reservesData[0],
        reserveY: reservesData[1],
        protocolFeeX: protocolFeesData[0],
        protocolFeeY: protocolFeesData[1],
        baseFactor: staticFeesData.baseFactor,
        protocolShare: staticFeesData.protocolShare,
      };
    } catch (error) {
      console.error(`Failed to fetch pool data for ${poolAddress}:`, error);
      throw error;
    }
  }

  async getAllPools(chain: string, startIndex: number = 0, count: number = 20) {
    const client = this.getClient(chain);
    const config = this.getConfig(chain);
    
    try {
      const numberOfPairs = await client.readContract({
        address: config.factoryAddress,
        abi: LB_FACTORY_ABI,
        functionName: 'getNumberOfLBPairs',
      }) as bigint;

      const totalPairs = Number(numberOfPairs);
      const endIndex = Math.min(startIndex + count, totalPairs);
      const pools = [];

      for (let i = startIndex; i < endIndex; i++) {
        try {
          const pairAddress = await client.readContract({
            address: config.factoryAddress,
            abi: LB_FACTORY_ABI,
            functionName: 'getLBPairAtIndex',
            args: [BigInt(i)],
          }) as Address;

          const poolData = await this.getPoolData(chain, pairAddress);
          pools.push(poolData);
        } catch (error) {
          console.warn(`Failed to fetch pool at index ${i}:`, error);
        }
      }

      return { pools, totalPairs };
    } catch (error) {
      console.error(`Failed to fetch pools for chain ${chain}:`, error);
      throw error;
    }
  }

  async getUserBinIds(chain: string, userAddress: Address, poolAddress: Address): Promise<number[]> {
    const client = this.getClient(chain);
    
    try {
      // Get transfer events to find user's bin positions
      const transferLogs = await client.getLogs({
        address: poolAddress,
        event: {
          type: 'event',
          name: 'TransferBatch',
          inputs: [
            { name: 'operator', type: 'address', indexed: true },
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'ids', type: 'uint256[]', indexed: false },
            { name: 'values', type: 'uint256[]', indexed: false }
          ]
        },
        args: { to: userAddress },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const binIds = new Set<number>();
      
      for (const log of transferLogs) {
        const { ids } = log.args as any;
        if (Array.isArray(ids)) {
          for (const id of ids) {
            binIds.add(Number(id));
          }
        }
      }

      // Check current balances for these bins
      const binIdsArray = Array.from(binIds);
      if (binIdsArray.length === 0) {
        return [];
      }
      
      const balances = await this.getBatchBalances(chain, poolAddress, userAddress, binIdsArray);
      
      // Return only bins with non-zero balance
      return binIdsArray.filter((_, index) => balances && balances[index] && balances[index] > 0n);
    } catch (error) {
      console.error(`Failed to get user bin IDs:`, error);
      return [];
    }
  }

  async getBatchBalances(chain: string, contractAddress: Address, userAddress: Address, tokenIds: number[]): Promise<bigint[]> {
    const client = this.getClient(chain);
    
    try {
      const balances = await Promise.all(
        tokenIds.map(id =>
          client.readContract({
            address: contractAddress,
            abi: LB_PAIR_ABI,
            functionName: 'balanceOf',
            args: [userAddress, BigInt(id)],
          })
        )
      );

      return balances as bigint[];
    } catch (error) {
      console.error(`Failed to get batch balances:`, error);
      return new Array(tokenIds.length).fill(0n);
    }
  }

  async getSwapHistory(chain: string, poolAddress: Address, fromBlock: bigint, toBlock: bigint) {
    const client = this.getClient(chain);
    
    try {
      const swapLogs = await client.getLogs({
        address: poolAddress,
        event: {
          type: 'event',
          name: 'Swap',
          inputs: [
            { name: 'sender', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'id', type: 'uint24', indexed: true },
            { name: 'amountsIn', type: 'bytes32', indexed: false },
            { name: 'amountsOut', type: 'bytes32', indexed: false },
            { name: 'volatilityAccumulator', type: 'uint24', indexed: false },
            { name: 'totalFees', type: 'bytes32', indexed: false },
            { name: 'protocolFees', type: 'bytes32', indexed: false }
          ]
        },
        fromBlock,
        toBlock,
      });

      return swapLogs;
    } catch (error) {
      console.error(`Failed to get swap history:`, error);
      return [];
    }
  }

  async getUserLiquidityEvents(chain: string, userAddress: Address, poolAddress: Address) {
    const client = this.getClient(chain);
    
    try {
      const [depositLogs, withdrawLogs] = await Promise.all([
        client.getLogs({
          address: poolAddress,
          event: {
            type: 'event',
            name: 'DepositedToBins',
            inputs: [
              { name: 'sender', type: 'address', indexed: true },
              { name: 'to', type: 'address', indexed: true },
              { name: 'ids', type: 'uint256[]', indexed: false },
              { name: 'amounts', type: 'bytes32[]', indexed: false }
            ]
          },
          args: { sender: userAddress },
          fromBlock: 'earliest',
          toBlock: 'latest',
        }),
        client.getLogs({
          address: poolAddress,
          event: {
            type: 'event',
            name: 'WithdrawnFromBins',
            inputs: [
              { name: 'sender', type: 'address', indexed: true },
              { name: 'to', type: 'address', indexed: true },
              { name: 'ids', type: 'uint256[]', indexed: false },
              { name: 'amounts', type: 'bytes32[]', indexed: false }
            ]
          },
          args: { sender: userAddress },
          fromBlock: 'earliest',
          toBlock: 'latest',
        })
      ]);

      return { deposits: depositLogs, withdrawals: withdrawLogs };
    } catch (error) {
      console.error(`Failed to get user liquidity events:`, error);
      return { deposits: [], withdrawals: [] };
    }
  }

  async getTokenPrice(tokenAddress: Address, chain: string): Promise<number> {
    const cacheKey = `${chain}-${tokenAddress.toLowerCase()}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }
    
    try {
      // For now, return 1.0 for stable calculation
      // In production, integrate with price APIs like CoinGecko, CoinMarketCap, etc.
      const price = await this.fetchPriceFromAPI(tokenAddress, chain);
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.warn(`Failed to fetch price for ${tokenAddress} on ${chain}:`, error);
      return 1.0;
    }
  }

  private async fetchPriceFromAPI(tokenAddress: Address, chain: string): Promise<number> {
    // Implement price fetching from external APIs
    // For now, return a placeholder
    return 1.0;
  }

  async aggregatePoolAnalytics(chain: string, poolAddress: Address, timeframe: string = '1d') {
    const client = this.getClient(chain);
    const config = this.getConfig(chain);
    
    try {
      const currentBlock = await client.getBlockNumber();
      
      // Calculate block range based on timeframe
      const timeframes: Record<string, number> = {
        '1h': config.blocksPerHour,
        '1d': config.blocksPerHour * 24,
        '7d': config.blocksPerHour * 24 * 7,
        '30d': config.blocksPerHour * 24 * 30
      };
      
      const blockRange = timeframes[timeframe as keyof typeof timeframes] || timeframes['1d'];
      const fromBlock = currentBlock - BigInt(blockRange || 0);
      
      const swapEvents = await this.getSwapHistory(chain, poolAddress, fromBlock, currentBlock);
      
      let totalVolumeUsd = 0;
      let totalFeesUsd = 0;
      let transactionCount = swapEvents.length;
      
      // Process swap events to calculate volume and fees
      for (const event of swapEvents) {
        // Parse amounts and fees from event data
        // This would need proper parsing of the bytes32 data
        // For now, using placeholder calculations
        totalVolumeUsd += 1000; // Placeholder
        totalFeesUsd += 3; // Placeholder
      }
      
      return {
        volumeUsd: totalVolumeUsd,
        feesUsd: totalFeesUsd,
        transactionCount,
        period: timeframe
      };
    } catch (error) {
      console.error(`Failed to aggregate pool analytics:`, error);
      return {
        volumeUsd: 0,
        feesUsd: 0,
        transactionCount: 0,
        period: timeframe
      };
    }
  }
}
