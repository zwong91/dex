import { useEffect, useState, useCallback, useMemo } from 'react'
import { useChainId } from 'wagmi'
import { getApiEndpoint } from '../utils/apiEndpoint'

// 简单的内存缓存
const cache = new Map<string, { data: ApiPool[]; timestamp: number; total: number }>();
const CACHE_DURATION = 30000; // 30秒缓存

// 重试机制常量
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1秒

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ApiPool {
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
  activeBinId?: number;
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
    pageSize: options.pageSize || 5, // 减少默认数量
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

  // 生成缓存键
  const cacheKey = useMemo(() => {
    return JSON.stringify(stableOptions);
  }, [stableOptions]);

  // 构建 API 查询参数
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('page', String(stableOptions.pageNum));
    params.append('limit', String(stableOptions.pageSize));
    params.append('orderBy', stableOptions.orderBy);
    params.append('filterBy', stableOptions.filterBy);
    params.append('status', stableOptions.status);
    params.append('version', stableOptions.version);
    params.append('excludeLowVolumePools', String(stableOptions.excludeLowVolumePools));
    return params;
  }, [stableOptions]);

  // 拉取池子数据
  const fetchPools = useCallback(async () => {
    // 检查缓存
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached pool data');
      setPools(cached.data);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const params = buildParams();
      const apiBaseUrl = getApiEndpoint(chainId);
      const url = `${apiBaseUrl}/v1/api/dex/pools/bsc?${params.toString()}`;
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      
      console.log('🚀 Fetching pool data:', url);
      const startTime = performance.now();
      
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
          });
          
          if (!res.ok && res.status >= 500 && retries < MAX_RETRIES) {
            console.log(`🔄 Server error ${res.status}, retrying... (${retries + 1}/${MAX_RETRIES})`);
            retries++;
            await sleep(RETRY_DELAY * retries);
            continue;
          }
          break;
        } catch (error) {
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
      
      // 存入缓存
      cache.set(cacheKey, {
        data: poolsData,
        total: totalCount,
        timestamp: Date.now()
      });
      
      setPools(poolsData);
      setTotal(totalCount);
      
      console.log(`✅ Loaded ${poolsData.length} pools`);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setPools([]);
      setTotal(0);
      console.error('❌ Pool data fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, buildParams]);

  // 自动拉取数据，依赖稳定的 cacheKey
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // 支持手动刷新（清除缓存）
  const refetch = useCallback(() => {
    cache.delete(cacheKey);
    fetchPools();
  }, [cacheKey, fetchPools]);

  return { pools, loading, error, total, refetch };
};