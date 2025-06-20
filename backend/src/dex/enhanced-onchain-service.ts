import { createPublicClient, http, parseAbi, getContract, formatUnits, type Address, fallback } from 'viem';
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
  'function totalSupply(uint256 id) external view returns (uint256)',
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

// LiquiBook Price Helper Functions
const SCALE_OFFSET = 128n;
const REAL_ID_SHIFT = 23n;

function getPriceFromId(activeId: number, binStep: number): bigint {
  const realId = BigInt(activeId) - SCALE_OFFSET;
  return (1n << REAL_ID_SHIFT) + (BigInt(binStep) * realId);
}

function formatPrice(price: bigint, decimalsX: number, decimalsY: number): string {
  const scaledPrice = price * BigInt(10 ** decimalsY) / (1n << REAL_ID_SHIFT);
  return formatUnits(scaledPrice, decimalsX);
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface PoolInfo {
  address: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  binStep: number;
  activeId: number;
  reserves: {
    reserveX: bigint;
    reserveY: bigint;
  };
  price: string;
  fees: {
    protocolFeeX: bigint;
    protocolFeeY: bigint;
  };
  totalSupply: bigint;
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  priceImpact: string;
  route: string[];
}

export class EnhancedOnChainService {
  private clients: Map<string, any> = new Map();
  private quoterClients: Map<string, any> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private poolCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly PRICE_CACHE_DURATION = 1 * 60 * 1000; // 1 minute

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    // BSC Mainnet with multiple RPC fallbacks
    const bscRpcUrls = [
      'https://bsc-dataseed1.binance.org/',
      'https://bsc-dataseed2.binance.org/',
      'https://bsc-dataseed3.binance.org/',
      'https://bsc-dataseed4.binance.org/',
      'https://rpc.ankr.com/bsc',
      'https://bsc.rpc.blxrbdn.com/',
      'https://bsc.blockpi.network/v1/rpc/public'
    ];

    // BSC Testnet with multiple RPC fallbacks  
    const bscTestRpcUrls = [
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
      'https://data-seed-prebsc-2-s1.binance.org:8545/',
      'https://data-seed-prebsc-1-s2.binance.org:8545/',
      'https://data-seed-prebsc-2-s2.binance.org:8545/'
    ];

    // Create fallback transports with improved timeout settings
    const createFallbackTransport = (urls: string[]) => {
      return fallback(
        urls.map(url => http(url, {
          timeout: 15000, // 15 second timeout per attempt
          retryCount: 2,
          retryDelay: 1000
        })),
        {
          rank: true,
          retryCount: 2,
          retryDelay: 500
        }
      );
    };

    this.clients.set('binance', createPublicClient({
      chain: bsc,
      transport: createFallbackTransport(bscRpcUrls)
    }));

    this.clients.set('bsctest', createPublicClient({
      chain: bscTestnet,
      transport: createFallbackTransport(bscTestRpcUrls)
    }));
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

  /**
   * 获取代币详细信息
   */
  async getTokenInfo(chain: string, tokenAddress: Address): Promise<TokenInfo> {
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

  /**
   * 获取池的完整信息
   */
  async getPoolInfo(chain: string, poolAddress: Address): Promise<PoolInfo> {
    const cacheKey = `${chain}-${poolAddress}`;
    const cached = this.poolCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const client = this.getClient(chain);
    
    try {
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

      const [tokenXInfo, tokenYInfo] = await Promise.all([
        this.getTokenInfo(chain, tokenX as Address),
        this.getTokenInfo(chain, tokenY as Address),
      ]);

      // 计算当前价格
      const priceFromId = getPriceFromId(activeId as number, binStep as number);
      const formattedPrice = formatPrice(priceFromId, tokenXInfo.decimals, tokenYInfo.decimals);

      // 计算总供应量（活跃bins的总和）
      const totalSupply = await this.calculateTotalSupply(client, poolAddress, activeId as number);

      const poolInfo: PoolInfo = {
        address: poolAddress,
        tokenX: tokenXInfo,
        tokenY: tokenYInfo,
        binStep: binStep as number,
        activeId: activeId as number,
        reserves: {
          reserveX: (reserves as any)[0],
          reserveY: (reserves as any)[1],
        },
        price: formattedPrice,
        fees: {
          protocolFeeX: (protocolFees as any)[0],
          protocolFeeY: (protocolFees as any)[1],
        },
        totalSupply,
      };

      // 缓存结果
      this.poolCache.set(cacheKey, {
        data: poolInfo,
        timestamp: Date.now()
      });

      return poolInfo;
    } catch (error) {
      console.error(`Error fetching pool info for ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * 计算池的总供应量
   */
  private async calculateTotalSupply(client: any, poolAddress: Address, activeId: number): Promise<bigint> {
    try {
      // 获取活跃bin周围的供应量
      const binIds = [];
      const range = 10; // 检查活跃bin周围10个bin
      
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
      console.warn('Error calculating total supply:', error);
      return 0n;
    }
  }

  /**
   * 获取交换报价
   */
  async getSwapQuote(
    chain: string,
    poolAddress: Address,
    amountIn: bigint,
    swapForY: boolean
  ): Promise<SwapQuote> {
    const config = this.getConfig(chain);
    const client = this.getClient(chain);

    try {
      const [amountInLeft, amountOut, fee] = await client.readContract({
        address: config.routerAddress,
        abi: LB_ROUTER_ABI,
        functionName: 'getSwapOut',
        args: [poolAddress, amountIn, swapForY]
      }) as [bigint, bigint, bigint];

      // 计算价格影响
      const poolInfo = await this.getPoolInfo(chain, poolAddress);
      const priceImpact = this.calculatePriceImpact(
        amountIn,
        amountOut,
        poolInfo.reserves,
        swapForY
      );

      return {
        amountIn: amountIn - amountInLeft,
        amountOut,
        fee,
        priceImpact,
        route: [poolInfo.tokenX.address, poolInfo.tokenY.address]
      };
    } catch (error) {
      console.error('Error getting swap quote:', error);
      throw error;
    }
  }

  /**
   * 计算价格影响
   */
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserves: { reserveX: bigint; reserveY: bigint },
    swapForY: boolean
  ): string {
    try {
      if (swapForY) {
        // Swapping X for Y
        const spotPrice = (reserves.reserveY * 10000n) / reserves.reserveX;
        const effectivePrice = (amountOut * 10000n) / amountIn;
        const impact = ((spotPrice - effectivePrice) * 10000n) / spotPrice;
        return (Number(impact) / 100).toFixed(2);
      } else {
        // Swapping Y for X
        const spotPrice = (reserves.reserveX * 10000n) / reserves.reserveY;
        const effectivePrice = (amountOut * 10000n) / amountIn;
        const impact = ((spotPrice - effectivePrice) * 10000n) / spotPrice;
        return (Number(impact) / 100).toFixed(2);
      }
    } catch (error) {
      return '0.00';
    }
  }

  /**
   * 获取用户在特定池中的流动性仓位
   */
  async getUserPositions(
    chain: string,
    poolAddress: Address,
    userAddress: Address,
    binIds: number[]
  ): Promise<{ binId: number; balance: bigint; reserveX: bigint; reserveY: bigint }[]> {
    const client = this.getClient(chain);

    try {
      const accounts = binIds.map(() => userAddress);
      const ids = binIds.map(id => BigInt(id));

      const [balances, binData] = await Promise.all([
        client.readContract({
          address: poolAddress,
          abi: LB_PAIR_ABI,
          functionName: 'balanceOfBatch',
          args: [accounts, ids]
        }),
        Promise.all(
          ids.map(id =>
            client.readContract({
              address: poolAddress,
              abi: LB_PAIR_ABI,
              functionName: 'getBin',
              args: [id]
            })
          )
        )
      ]);

      return binIds.map((binId, index) => ({
        binId,
        balance: (balances as bigint[])[index] || 0n,
        reserveX: BigInt((binData[index] as any)?.[0] || 0),
        reserveY: BigInt((binData[index] as any)?.[1] || 0)
      }));
    } catch (error) {
      console.error('Error getting user positions:', error);
      return [];
    }
  }

  /**
   * 获取池的历史数据
   */
  async getPoolHistory(
    chain: string,
    poolAddress: Address,
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<any[]> {
    const client = this.getClient(chain);

    try {
      // 这里应该从事件日志中获取历史数据
      // 由于这是一个复杂的操作，我们返回基本结构
      return [];
    } catch (error) {
      console.error('Error getting pool history:', error);
      return [];
    }
  }

  /**
   * 获取代币价格（USD）
   */
  async getTokenPriceUSD(chain: string, tokenAddress: Address): Promise<number> {
    const cacheKey = `${chain}-${tokenAddress}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) {
      return cached.price;
    }

    try {
      // 这里应该集成价格oracle或DEX聚合器
      // 暂时返回模拟价格
      const price = 1.0; // 默认价格
      
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error('Error getting token price:', error);
      return 0;
    }
  }

  /**
   * 批量获取多个池的信息
   */
  async getMultiplePoolsInfo(chain: string, poolAddresses: Address[]): Promise<PoolInfo[]> {
    const promises = poolAddresses.map(address => 
      this.getPoolInfo(chain, address).catch(error => {
        console.error(`Error fetching pool ${address}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((pool): pool is PoolInfo => pool !== null);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.priceCache.clear();
    this.poolCache.clear();
  }

  /**
   * 获取网络状态
   */
  async getNetworkStatus(chain: string): Promise<{
    blockNumber: bigint;
    gasPrice: bigint;
    chainId: number;
  }> {
    const client = this.getClient(chain);
    const config = this.getConfig(chain);

    try {
      const [blockNumber, gasPrice] = await Promise.all([
        client.getBlockNumber(),
        client.getGasPrice()
      ]);

      return {
        blockNumber,
        gasPrice,
        chainId: config.chain.id
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      throw error;
    }
  }
}

/**
 * 创建增强的链上服务实例
 */
export function createEnhancedOnChainService(): EnhancedOnChainService {
  return new EnhancedOnChainService();
}
