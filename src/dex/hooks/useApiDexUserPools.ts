import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { getApiEndpoint } from '../utils/apiEndpoint';

export interface DexUserPool {
  id: string;
  pairAddress: string;
  chain: string;
  name: string;
  status: string;
  version: string;
  tokenX: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  tokenY: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  reserveX: number;
  reserveY: number;
  lbBinStep: number;
  activeId: number;
  liquidityUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  txCount: number;
  liquidityProviderCount: number;
  apr: number;
  apy: number;
  createdAt: string;
  lastUpdate: number;
}

export const useApiDexUserPools = (userAddress: string | undefined) => {
  const [pools, setPools] = useState<DexUserPool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const fetchUserPools = useCallback(async () => {
    if (!userAddress) {
      setPools([]);
      setLoading(false);
      setError('No user address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiEndpoint(chainId);
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      const url = `${apiBaseUrl}/v1/api/dex/user/${userAddress}/pool-ids`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setPools(data.data);
      } else {
        setPools([]);
        setError('No user pool data');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchUserPools();
  }, [fetchUserPools]);

  return { pools, loading, error, refetch: fetchUserPools };
};
