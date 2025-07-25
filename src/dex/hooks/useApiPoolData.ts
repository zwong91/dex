import { useEffect, useState, useCallback, useMemo } from 'react'
import { useChainId } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { getApiEndpoint } from '../utils/apiEndpoint'

// 更智能的分层缓存
const cache = new Map<string, { data: ApiPool[]; timestamp: number; total: number }>();
const fastCache = new Map<string, { data: ApiPool[]; timestamp: number; total: number }>(); // 快速缓存
const CACHE_DURATION = 30000; // 30秒正常缓存
const FAST_CACHE_DURATION = 5000; // 5秒快速缓存
const BACKGROUND_REFRESH_THRESHOLD = 20000; // 20秒后后台刷新

// 重试机制常量
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1秒

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ApiPool {
  id?: string; // API返回的池子ID
  pairAddress: string;
  chain: string;
  name: string;
  status: string;
  version: string;
  tokenX: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  tokenY: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  reserveX: number;
  reserveY: number;
  lbBinStep: number;
  lbBaseFeePct?: number;
  lbMaxFeePct?: number;
  activeId?: number;
  liquidityUsd: number;
  liquidityNative?: string;
  liquidityDepthMinus?: number;
  liquidityDepthPlus?: number;
  liquidityDepthTokenX?: number;
  liquidityDepthTokenY?: number;
  volumeUsd: number;
  volumeNative?: string;
  feesUsd: number;
  feesNative?: string;
  protocolSharePct?: number;
  // New fields from actual API
  volume24hUsd: number;
  fees24hUsd: number;
  apr: number;
  apy: number;
  txCount: number;
  liquidityProviderCount: number;
  createdAt: string;
  lastUpdate: number;
  // Pre-formatted fields for display
  tvlFormatted: string;
  aprFormatted: string;
  volume24hFormatted: string;
  fees24hFormatted: string;
}

export interface UseApiPoolDataOptions {
  chain: string;
  pageSize?: number;
  pageNum?: number;
  orderBy?: string;
  filterBy?: string;
  status?: string;
  version?: string;
  excludeLowVolumePools?: boolean;
}

/**
 * useApiPoolData - 优化版的池子列表数据 Hook
 * 特性：缓存、减少请求、依赖优化、错误重试
 */
export const useApiPoolData = (options: UseApiPoolDataOptions) => {
  const [pools, setPools] = useState<ApiPool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();
  const [total, setTotal] = useState<number>(0);

  // 使用 useMemo 稳定化 options，避免不必要的重新请求
  const stableOptions = useMemo(() => ({
    chain: options.chain || 'bsc',
    pageSize: options.pageSize || 10, // 默认数量
    pageNum: options.pageNum || 1,
    orderBy: options.orderBy || 'volume',
    filterBy: options.filterBy || '1d',
    status: options.status || 'main',
    version: options.version || 'all',
    excludeLowVolumePools: options.excludeLowVolumePools ?? true
  }), [
    options.chain,
    options.pageSize,
    options.pageNum,
    options.orderBy,
    options.filterBy,
    options.status,
    options.version,
    options.excludeLowVolumePools
  ]);

  // 生成缓存键 - 包含 chainId 确保网络切换时重新请求
  const cacheKey = useMemo(() => {
    return JSON.stringify({ ...stableOptions, chainId });
  }, [stableOptions, chainId]);

  // 构建 API 查询参数
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    // 🚨 修复：使用正确的参数名称 
    params.append('page', String(stableOptions.pageNum)); // 后端期望 page
    params.append('limit', String(stableOptions.pageSize)); // 后端期望 limit
    params.append('orderBy', stableOptions.orderBy);
    params.append('filterBy', stableOptions.filterBy);
    params.append('status', stableOptions.status);
    params.append('version', stableOptions.version);
    params.append('excludeLowVolumePools', String(stableOptions.excludeLowVolumePools));
    return params;
  }, [stableOptions]);

  // 拉取池子数据 - 优化版本
  const fetchPools = useCallback(async (isBackground = false) => {
    const now = Date.now();
    
    // 检查快速缓存（5秒内直接返回）
    const fastCached = fastCache.get(cacheKey);
    if (fastCached && now - fastCached.timestamp < FAST_CACHE_DURATION) {
      console.log('⚡ Using fast cache (< 5s)');
      setPools(fastCached.data);
      setTotal(fastCached.total);
      setLoading(false);
      return;
    }
    
    // 检查正常缓存
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached pool data');
      setPools(cached.data);
      setTotal(cached.total);
      setLoading(false);
      
      // 如果缓存超过20秒，后台刷新
      if (now - cached.timestamp > BACKGROUND_REFRESH_THRESHOLD && !isBackground) {
        console.log('🔄 Background refresh triggered');
        setTimeout(() => fetchPools(true), 100); // 后台刷新
      }
      return;
    }

    // 只有前台请求才显示loading
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = buildParams();
      const apiBaseUrl = getApiEndpoint(chainId);
      // Determine chain path based on chainId
      const chainPath = chainId === bscTestnet.id ? 'bsc-testnet' : 'bsc'; // BSC Testnet vs BSC Mainnet
      const url = `${apiBaseUrl}/v1/api/dex/pools/${chainPath}?${params.toString()}`;
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      
      if (!isBackground) {
        console.log('� Network debug:', { 
          chainId, 
          bscTestnetId: bscTestnet.id, 
          chainPath, 
          apiBaseUrl,
          url 
        });
        console.log('�🚀 Fetching pool data:', url);
      }
      const startTime = performance.now();
      
      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
      
      // 使用内联重试逻辑
      let res: Response;
      let retries = 0;
      while (retries <= MAX_RETRIES) {
        try {
          res = await fetch(url, {
            headers: {
              'x-api-key': apiKey,
              'Accept': 'application/json'
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId); // 清除超时
          
          if (!res.ok && res.status >= 500 && retries < MAX_RETRIES) {
            console.log(`🔄 Server error ${res.status}, retrying... (${retries + 1}/${MAX_RETRIES})`);
            retries++;
            await sleep(RETRY_DELAY * retries);
            continue;
          }
          break;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout (8s)');
          }
          if (retries < MAX_RETRIES) {
            console.log(`🔄 Network error, retrying... (${retries + 1}/${MAX_RETRIES})`);
            retries++;
            await sleep(RETRY_DELAY * retries);
            continue;
          }
          throw error;
        }
      }
      
      const endTime = performance.now();
      console.log(`⏱️ API request took ${(endTime - startTime).toFixed(2)}ms`);
      
      if (!res!.ok) throw new Error(`API error: ${res!.status} ${res!.statusText}`);
      
      const data = await res!.json();
      let poolsData: ApiPool[] = [];
      let totalCount = 0;
      
      // 兼容后端返回数组或 { data, pagination }
      if (Array.isArray(data)) {
        poolsData = data;
        totalCount = data.length;
      } else if (data.data) {
        poolsData = data.data;
        totalCount = data.pagination?.total || data.data.length;
      }

      // 直接在这里处理字段映射和格式化，避免前端转换
      const processedPools = poolsData.map((pool: any) => {
        console.log('🔍 DEBUG: Processing raw pool data:', {
          poolId: pool.id,
          pairAddress: pool.pairAddress,
          finalPairAddress: pool.pairAddress || pool.id, // 显示最终使用的地址
          hasValidPairAddress: !!(pool.pairAddress || pool.id),
          poolKeys: Object.keys(pool),
          volume24hUsd: pool.volume24hUsd,
          fees24hUsd: pool.fees24hUsd,
          liquidityUsd: pool.liquidityUsd
        });
        
        return {
          ...pool,
          // 🔧 修复字段映射 - 后端返回 id，前端需要 pairAddress
          pairAddress: pool.pairAddress || pool.id, // 使用 id 作为 pairAddress
          // 统一字段名映射
          volumeUsd: pool.volume24hUsd || 0,
          feesUsd: pool.fees24hUsd || 0,
          lbBaseFeePct: pool.apr || 0,
          // 格式化显示字段 - 直接显示后端数据，不做任何过滤
          tvlFormatted: `$${Number(pool.liquidityUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          aprFormatted: pool.apr ? `${pool.apr.toFixed(2)}%` : '0.00%',
          volume24hFormatted: pool.volume24hUsd ? `$${Number(pool.volume24hUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : '$0',
          fees24hFormatted: pool.fees24hUsd ? `$${Number(pool.fees24hUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : '$0',
        };
      });
      
      // 存入双层缓存
      const cacheData = {
        data: processedPools,
        total: totalCount,
        timestamp: Date.now()
      };
      
      // 存入正常缓存
      cache.set(cacheKey, cacheData);
      // 存入快速缓存（用于短时间内的快速响应）
      fastCache.set(cacheKey, cacheData);
      
      setPools(processedPools);
      setTotal(totalCount);
      
      if (!isBackground) {
        console.log(`✅ Loaded ${processedPools.length} pools`);
      } else {
        console.log(`🔄 Background updated ${processedPools.length} pools`);
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setPools([]);
      setTotal(0);
      
      if (!isBackground) {
        console.error('❌ Pool data fetch error:', errorMessage);
      }
    } finally {
      // 只有前台请求才隐藏loading
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [cacheKey, buildParams, chainId]);

  // 自动拉取数据，依赖稳定的 cacheKey
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // 支持手动刷新（清除缓存）
  const refetch = useCallback(() => {
    console.log('🧹 Clearing all caches...');
    cache.clear(); // 清除所有缓存
    fastCache.clear(); // 清除所有快速缓存
    fetchPools();
  }, [fetchPools]); // 移除cacheKey依赖，强制重新获取

  // 清理过期缓存
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      // 清理快速缓存
      for (const [key, value] of fastCache.entries()) {
        if (now - value.timestamp > FAST_CACHE_DURATION * 2) {
          fastCache.delete(key);
        }
      }
      // 清理正常缓存
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          cache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次

    return () => clearInterval(cleanupInterval);
  }, []);

  return { pools, loading, error, total, refetch };
};