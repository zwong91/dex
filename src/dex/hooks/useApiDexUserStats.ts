import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { getApiEndpoint } from '../utils/apiEndpoint';

export interface DexUserStats {
  address: string;
  totalVolumeUsd: string;
  totalFeesUsd: string;
  totalSwaps: number;
  totalLiquidityUsd: string;
  poolsCount: number;
  rewardsUsd?: string;
}

export const useApiDexUserStats = (userAddress: string | undefined) => {
  const [stats, setStats] = useState<DexUserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const fetchUserStats = useCallback(async () => {
    if (!userAddress) {
      setStats(null);
      setLoading(false);
      setError('No user address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiEndpoint(chainId);
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      const url = `${apiBaseUrl}/v1/api/dex/user/${userAddress}/lifetime-stats`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setStats(data.data);
      } else {
        setStats(null);
        setError('No user stats data');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return { stats, loading, error, refetch: fetchUserStats };
};
