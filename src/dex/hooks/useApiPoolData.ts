import { useEffect, useState, useCallback } from 'react';

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
 * useApiPoolData - 前端池子列表统一后端 API 数据源的自定义 Hook
 * 支持分页、排序、过滤、链切换，自动处理 loading/error/total
 */
export const useApiPoolData = (options: UseApiPoolDataOptions) => {
  const [pools, setPools] = useState<ApiPool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  // 构建 API 查询参数
  const buildParams = () => {
    const params = new URLSearchParams();
    // API 规范：分页参数为 page/limit
    if (options.pageNum) params.append('page', String(options.pageNum));
    if (options.pageSize) params.append('limit', String(options.pageSize));
    // 其它参数如 orderBy/filterBy/status/version 可按需扩展
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.filterBy) params.append('filterBy', options.filterBy);
    if (options.status) params.append('status', options.status);
    if (options.version) params.append('version', options.version);
    if (options.excludeLowVolumePools !== undefined) params.append('excludeLowVolumePools', String(options.excludeLowVolumePools));
    return params;
  };

  // 拉取池子数据
  const fetchPools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.dex.jongun2038.win';
      // API 路径修正：/v1/api/dex/pools/{chain}
      const chain = options.chain || 'bsc'; // 默认链为 BSC
      if (!chain) throw new Error('Chain is required');
      // 确保 chain 是小写
      const apiChain = chain.toLowerCase();
      // 构建完整 URL
      // 注意：如果后端 API 支持多链，可能需要调整路径或参数
      // 例如：/v1/api/dex/pools/bsc?param=value
      const url = `${apiBaseUrl}/v1/api/dex/pools/bsc?${params.toString()}`;
      const apiKey = import.meta.env.VITE_API_KEY || 'test-secret-key';
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      // 兼容后端返回数组或 { data, pagination }
      if (Array.isArray(data)) {
        setPools(data);
        setTotal(data.length);
      } else if (data.data) {
        setPools(data.data);
        setTotal(data.pagination?.total || data.data.length);
      } else {
        setPools([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setPools([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [options]);

  // 自动拉取数据，依赖 options 变化
  useEffect(() => {
    fetchPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options)]);

  // 支持手动刷新
  const refetch = useCallback(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, loading, error, total, refetch };
};