import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { getApiEndpoint } from '../utils/apiEndpoint';

export interface DexPoolDetails {
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
  swapCount: number;
  activeBins: number;
  totalBins: number;
  recentSwaps: any[];
}

export const useApiDexPoolDetails = (poolId: string | undefined) => {
  const [details, setDetails] = useState<DexPoolDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const fetchDetails = useCallback(async () => {
    if (!poolId) {
      setDetails(null);
      setLoading(false);
      setError('No poolId');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiEndpoint(chainId);
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      const url = `${apiBaseUrl}/v1/api/dex/pools/bsc/${poolId}`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setDetails(data.data);
      } else {
        setDetails(null);
        setError('No pool details');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [poolId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { details, loading, error, refetch: fetchDetails };
};
