import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { getApiEndpoint } from '../utils/apiEndpoint';

export interface DexAnalytics {
  totalVolume24h: string;
  totalVolume7d: string;
  totalTvl: string;
  totalFees24h: string;
  totalPools: number;
  totalTokens: number;
  totalUsers: number;
  topPools: Array<{
    id: string;
    name: string;
    tvl: number;
    volume24h: number;
    fees24h: number;
  }>;
  volumeChart: Array<{ timestamp: string; volume: string }>;
  tvlChart: Array<{ timestamp: string; tvl: string }>;
}

export const useApiDexAnalytics = () => {
  const [analytics, setAnalytics] = useState<DexAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiEndpoint(chainId);
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      const url = `${apiBaseUrl}/v1/api/dex/analytics`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        // 保证 topPools/volumeChart/tvlChart 不为 undefined
        setAnalytics({
          ...data.data,
          topPools: Array.isArray(data.data.topPools) ? data.data.topPools : [],
          volumeChart: Array.isArray(data.data.volumeChart) ? data.data.volumeChart : [],
          tvlChart: Array.isArray(data.data.tvlChart) ? data.data.tvlChart : [],
        });
      } else {
        setAnalytics({
          totalVolume24h: '0',
          totalVolume7d: '0',
          totalTvl: '0',
          totalFees24h: '0',
          totalPools: 0,
          totalTokens: 0,
          totalUsers: 0,
          topPools: [],
          volumeChart: [],
          tvlChart: [],
        });
        setError('No analytics data');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
};
