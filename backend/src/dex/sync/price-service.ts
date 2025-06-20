import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, gte } from 'drizzle-orm';
import * as schema from '../../database/schema';
import type { Env } from '../../index';

export interface TokenPrice {
  address: string;
  chain: string;
  priceUsd: number;
  volume24h?: number;
  marketCap?: number;
  priceChange24h?: number;
  timestamp: number;
}

export interface PriceSource {
  name: string;
  url: string;
  weight: number; // 权重，用于聚合价格
}

export interface PriceResponse {
  address: string;
  price: number;
  volume24h?: number;
  marketCap?: number;
  timestamp: number;
  source: string;
}

export class PriceService {
  private db: ReturnType<typeof drizzle>;
  private priceCache = new Map<string, TokenPrice>();
  private lastCacheUpdate = 0;
  private readonly cacheExpiry = 5 * 60 * 1000; // 5分钟缓存

  // 价格数据源配置
  private readonly priceSources: PriceSource[] = [
    { name: 'coingecko', url: 'https://api.coingecko.com/api/v3', weight: 0.4 },
    { name: 'coinmarketcap', url: 'https://pro-api.coinmarketcap.com/v1', weight: 0.3 },
    { name: 'binance', url: 'https://api.binance.com/api/v3', weight: 0.2 },
    { name: 'pancakeswap', url: 'https://api.pancakeswap.info/api/v2', weight: 0.1 }
  ];

  // 主流代币地址映射
  private readonly tokenMappings = new Map([
    // BSC主网
    ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', { symbol: 'WBNB', coingeckoId: 'wbnb' }], // WBNB
    ['0x55d398326f99059ff775485246999027b3197955', { symbol: 'USDT', coingeckoId: 'tether' }], // BSC-USD
    ['0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', { symbol: 'USDC', coingeckoId: 'usd-coin' }], // USDC
    ['0xe9e7cea3dedca5984780bafc599bd69add087d56', { symbol: 'BUSD', coingeckoId: 'binance-usd' }], // BUSD
    ['0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', { symbol: 'BTCB', coingeckoId: 'bitcoin' }], // BTCB
    ['0x2170ed0880ac9a755fd29b2688956bd959f933f8', { symbol: 'ETH', coingeckoId: 'ethereum' }], // ETH
    ['0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', { symbol: 'CAKE', coingeckoId: 'pancakeswap-token' }], // CAKE
    
    // BSC测试网
    ['0xae13d989dac2f0debff460ac112a837c89baa7cd', { symbol: 'WBNB', coingeckoId: 'wbnb' }], // WBNB testnet
  ]);

  constructor(private env: Env) {
    if (!env.D1_DATABASE) {
      throw new Error('D1_DATABASE not configured');
    }
    this.db = drizzle(env.D1_DATABASE, { schema });
  }

  /**
   * 获取代币价格（优先从缓存）
   */
  async getTokenPrice(tokenAddress: string, chain: string): Promise<TokenPrice | null> {
    const cacheKey = `${chain}:${tokenAddress.toLowerCase()}`;
    
    // 检查缓存
    if (this.isCacheValid() && this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    // 从数据库获取最新价格
    try {
      const result = await this.db
        .select()
        .from(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.tokenAddress, tokenAddress.toLowerCase()),
            eq(schema.priceHistory.chain, chain)
          )
        )
        .orderBy(desc(schema.priceHistory.timestamp))
        .limit(1);

      if (result.length > 0) {
        const priceData = result[0];
        if (priceData) {
          const tokenPrice: TokenPrice = {
            address: priceData.tokenAddress,
            chain: priceData.chain,
            priceUsd: priceData.priceUsd || 0,
            volume24h: priceData.volume24h || undefined,
            marketCap: priceData.marketCap || undefined,
            timestamp: priceData.timestamp.getTime()
          };

          // 缓存价格数据
          this.priceCache.set(cacheKey, tokenPrice);
          return tokenPrice;
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to get token price for ${tokenAddress} on ${chain}:`, error);
      return null;
    }
  }

  /**
   * 批量获取代币价格
   */
  async getTokenPrices(tokenAddresses: string[], chain: string): Promise<Map<string, TokenPrice>> {
    const prices = new Map<string, TokenPrice>();

    // 使用批量查询
    try {
      const results = await this.db
        .select()
        .from(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.chain, chain),
            // 这里需要使用IN查询，但drizzle可能不支持，所以使用循环
          )
        )
        .orderBy(desc(schema.priceHistory.timestamp));

      // 按代币地址分组，取最新价格
      const latestPrices = new Map<string, any>();
      for (const result of results) {
        const addr = result.tokenAddress.toLowerCase();
        if (tokenAddresses.includes(addr) && !latestPrices.has(addr)) {
          latestPrices.set(addr, result);
        }
      }

      // 转换为TokenPrice格式
      for (const [address, priceData] of latestPrices) {
        prices.set(address, {
          address: priceData.tokenAddress,
          chain: priceData.chain,
          priceUsd: priceData.priceUsd || 0,
          volume24h: priceData.volume24h || undefined,
          marketCap: priceData.marketCap || undefined,
          timestamp: priceData.timestamp
        });
      }

      // 缓存结果
      for (const [address, price] of prices) {
        const cacheKey = `${chain}:${address}`;
        this.priceCache.set(cacheKey, price);
      }

    } catch (error) {
      console.error('Failed to get batch token prices:', error);
    }

    return prices;
  }

  /**
   * 从外部API更新代币价格
   */
  async updateTokenPrices(tokenAddresses: string[]): Promise<void> {
    console.log(`Updating prices for ${tokenAddresses.length} tokens...`);

    const batchSize = 20;
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      
      try {
        await this.updateBatchPrices(batch);
        
        // 添加延迟避免API限制
        if (i + batchSize < tokenAddresses.length) {
          await this.sleep(1000);
        }
      } catch (error) {
        console.error(`Failed to update batch prices:`, error);
      }
    }

    console.log('Token price update completed');
  }

  /**
   * 批量更新代币价格
   */
  private async updateBatchPrices(tokenAddresses: string[]): Promise<void> {
    const pricePromises = tokenAddresses.map(async (address) => {
      try {
        return await this.fetchTokenPriceFromSources(address);
      } catch (error) {
        console.error(`Failed to fetch price for ${address}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(pricePromises);
    const priceUpdates: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const price = result.value;
        const tokenAddress = tokenAddresses[index];
        if (tokenAddress && price) {
          priceUpdates.push({
            tokenAddress: tokenAddress.toLowerCase(),
            chain: 'bsc', // 暂时硬编码为BSC
            priceUsd: price.price || 0,
            volume24h: price.volume24h,
            marketCap: price.marketCap,
            timestamp: Date.now()
          });
        }
      }
    });

    // 批量插入数据库
    if (priceUpdates.length > 0) {
      try {
        await this.db.insert(schema.priceHistory).values(priceUpdates);
        console.log(`Updated ${priceUpdates.length} token prices`);
      } catch (error) {
        console.error('Failed to save price updates to database:', error);
      }
    }
  }

  /**
   * 从多个数据源获取代币价格
   */
  private async fetchTokenPriceFromSources(tokenAddress: string): Promise<PriceResponse | null> {
    const tokenMapping = this.tokenMappings.get(tokenAddress.toLowerCase());
    
    if (!tokenMapping) {
      console.warn(`No mapping found for token ${tokenAddress}`);
      return null;
    }

    const pricePromises: Promise<PriceResponse | null>[] = [
      this.fetchFromCoinGecko(tokenMapping.coingeckoId),
      this.fetchFromPancakeSwap(tokenAddress),
      this.fetchFromBinance(tokenMapping.symbol)
    ];

    const results = await Promise.allSettled(pricePromises);
    const validPrices: PriceResponse[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        validPrices.push(result.value);
      }
    });

    if (validPrices.length === 0) {
      return null;
    }

    // 使用加权平均计算最终价格
    return this.aggregatePrices(validPrices, tokenAddress);
  }

  /**
   * 从CoinGecko获取价格
   */
  private async fetchFromCoinGecko(tokenId: string): Promise<PriceResponse | null> {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;
      const tokenData = data[tokenId];

      if (!tokenData) {
        return null;
      }

      return {
        address: '',
        price: tokenData.usd || 0,
        volume24h: tokenData.usd_24h_vol,
        marketCap: tokenData.usd_market_cap,
        timestamp: Date.now(),
        source: 'coingecko'
      };
    } catch (error) {
      console.error('CoinGecko fetch error:', error);
      return null;
    }
  }

  /**
   * 从PancakeSwap获取价格
   */
  private async fetchFromPancakeSwap(tokenAddress: string): Promise<PriceResponse | null> {
    try {
      const url = `https://api.pancakeswap.info/api/v2/tokens/${tokenAddress}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any;
      
      if (!data.data || !data.data.price) {
        return null;
      }

      return {
        address: tokenAddress,
        price: parseFloat(data.data.price) || 0,
        volume24h: parseFloat(data.data.price_BNB) || undefined,
        timestamp: Date.now(),
        source: 'pancakeswap'
      };
    } catch (error) {
      console.error('PancakeSwap fetch error:', error);
      return null;
    }
  }

  /**
   * 从Binance获取价格
   */
  private async fetchFromBinance(symbol: string): Promise<PriceResponse | null> {
    try {
      // 尝试不同的交易对
      const pairs = [`${symbol}USDT`, `${symbol}BUSD`, `${symbol}BNB`];
      
      for (const pair of pairs) {
        try {
          const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
          
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
            }
          });

          if (!response.ok) {
            continue;
          }

          const data = await response.json() as any;
          
          let priceUsd = parseFloat(data.lastPrice);
          
          // 如果是BNB交易对，需要转换为USD
          if (pair.endsWith('BNB')) {
            const bnbPrice = await this.getBNBPrice();
            priceUsd = priceUsd * bnbPrice;
          }

          return {
            address: '',
            price: priceUsd,
            volume24h: parseFloat(data.volume),
            timestamp: Date.now(),
            source: 'binance'
          };
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Binance fetch error:', error);
      return null;
    }
  }

  /**
   * 获取BNB价格（用于转换）
   */
  private async getBNBPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
      const data = await response.json() as any;
      return parseFloat(data.price) || 300; // 默认300美元
    } catch (error) {
      return 300; // 回退价格
    }
  }

  /**
   * 聚合多个数据源的价格
   */
  private aggregatePrices(prices: PriceResponse[], tokenAddress: string): PriceResponse {
    if (prices.length === 1) {
      const priceData = prices[0];
      if (priceData) {
        return { 
          ...priceData, 
          address: tokenAddress,
          price: priceData.price ?? 0,  // Ensure price is always a number
          timestamp: priceData.timestamp ?? Date.now(),  // Ensure timestamp is always a number
          source: priceData.source ?? 'unknown'  // Ensure source is always a string
        };
      }
    }

    // 使用加权平均
    let weightedSum = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let totalMarketCap = 0;
    let validVolumes = 0;
    let validMarketCaps = 0;

    prices.forEach((price) => {
      const source = this.priceSources.find(s => s.name === price.source);
      const weight = source?.weight || 0.1;
      const priceValue = price.price ?? 0;
      
      weightedSum += priceValue * weight;
      totalWeight += weight;
      
      if (price.volume24h) {
        totalVolume += price.volume24h;
        validVolumes++;
      }
      
      if (price.marketCap) {
        totalMarketCap += price.marketCap;
        validMarketCaps++;
      }
    });

    const aggregatedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const avgVolume = validVolumes > 0 ? totalVolume / validVolumes : undefined;
    const avgMarketCap = validMarketCaps > 0 ? totalMarketCap / validMarketCaps : undefined;

    return {
      address: tokenAddress,
      price: aggregatedPrice,
      volume24h: avgVolume,
      marketCap: avgMarketCap,
      timestamp: Date.now(),
      source: 'aggregated'
    };
  }

  /**
   * 获取代币价格历史
   */
  async getTokenPriceHistory(
    tokenAddress: string,
    chain: string,
    startTime: number,
    endTime: number,
    interval: '1h' | '4h' | '1d' = '1h'
  ): Promise<TokenPrice[]> {
    try {
      const result = await this.db
        .select()
        .from(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.tokenAddress, tokenAddress.toLowerCase()),
            eq(schema.priceHistory.chain, chain),
            gte(schema.priceHistory.timestamp, new Date(startTime)),
            gte(schema.priceHistory.timestamp, new Date(endTime))
          )
        )
        .orderBy(desc(schema.priceHistory.timestamp));

      // 根据间隔过滤数据
      const filteredData: TokenPrice[] = [];
      let lastTimestamp = 0;
      const intervalMs = this.getIntervalMs(interval);

      for (const record of result) {
        const recordTimestamp = record.timestamp.getTime();
        if (recordTimestamp - lastTimestamp >= intervalMs) {
          filteredData.push({
            address: record.tokenAddress,
            chain: record.chain,
            priceUsd: record.priceUsd || 0,
            volume24h: record.volume24h || undefined,
            marketCap: record.marketCap || undefined,
            timestamp: recordTimestamp
          });
          lastTimestamp = recordTimestamp;
        }
      }

      return filteredData.reverse(); // 按时间正序返回
    } catch (error) {
      console.error('Failed to get price history:', error);
      return [];
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  /**
   * 清除价格缓存
   */
  clearCache(): void {
    this.priceCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * 获取间隔毫秒数
   */
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      // 测试数据库连接
      await this.db.select().from(schema.priceHistory).limit(1);
      
      // 测试外部API连接
      const testPromises = [
        this.fetchFromCoinGecko('bitcoin'),
        this.fetchFromBinance('BTC')
      ];

      const results = await Promise.allSettled(testPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (successCount === testPromises.length) {
        status = 'healthy';
      } else if (successCount > 0) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        details: {
          cacheSize: this.priceCache.size,
          lastCacheUpdate: this.lastCacheUpdate,
          apiTests: {
            total: testPromises.length,
            successful: successCount
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}
