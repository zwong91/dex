import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { getApiEndpoint } from '../utils/apiEndpoint';

export interface DexUserHistoryItem {
  id: string;
  type: string;
  timestamp: string;
  txHash: string;
  poolId?: string;
  tokenX?: string;
  tokenY?: string;
  amountX?: string;
  amountY?: string;
  volumeUsd?: string;
  feesUsd?: string;
}

export const useApiDexUserHistory = (userAddress: string | undefined) => {
  const [history, setHistory] = useState<DexUserHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const fetchUserHistory = useCallback(async () => {
    if (!userAddress) {
      setHistory([]);
      setLoading(false);
      setError('No user address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiEndpoint(chainId);
      const apiKey = import.meta.env.VITE_API_KEY || 'test-key';
      const url = `${apiBaseUrl}/v1/api/dex/user/${userAddress}/history`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setHistory(data.data);
      } else {
        setHistory([]);
        setError('No user history data');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchUserHistory();
  }, [fetchUserHistory]);

  return { history, loading, error, refetch: fetchUserHistory };
};
