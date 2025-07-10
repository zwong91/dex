import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { getApiEndpoint } from '../utils/apiEndpoint';

export interface DexToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  priceNative: string;
  totalSupply: string;
  volume24h: string;
  poolCount: number;
  liquidityUsd: number;
}

export const useApiDexTokens = () => {
  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiEndpoint(chainId);
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      const url = `${apiBaseUrl}/v1/api/dex/tokens`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setTokens(data.data);
      } else {
        setTokens([]);
        setError('No token data');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, error, refetch: fetchTokens };
};
