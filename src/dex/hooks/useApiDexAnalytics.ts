import { useEffect, useState, useCallback } from 'react';

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

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.dex.jongun2038.win';
      const apiKey = import.meta.env.VITE_API_KEY || 'test-secret-key';
      const url = `${apiBaseUrl}/v1/api/dex/analytics`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setAnalytics(data.data);
      } else {
        setAnalytics(null);
        setError('No analytics data');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
};
