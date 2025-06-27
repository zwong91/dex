import { useEffect, useState } from 'react';
import axios from 'axios';

export function useApiDexUserPoolUserBalances(chainId: string, lpAddress: string, poolAddress: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chainId || !lpAddress || !poolAddress) return;
    setLoading(true);
    axios.get(
      `https://api.dex.jongun2038.win/v1/api/dex/user/pool-user-balances?chainId=${chainId}&lpAddress=${lpAddress}&poolAddress=${poolAddress}`,
      { headers: { 'x-api-key': 'test-key' } }
    ).then(res => setData(res.data))
     .finally(() => setLoading(false));
  }, [chainId, lpAddress, poolAddress]);

  return { data, loading };
}
