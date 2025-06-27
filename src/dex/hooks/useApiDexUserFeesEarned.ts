import { useEffect, useState } from 'react';
import axios from 'axios';

export function useApiDexUserFeesEarned(chain: string, address: string, poolAddress: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chain || !address || !poolAddress) return;
    setLoading(true);
    axios.get(
      `https://api.dex.jongun2038.win/v1/api/dex/user/fees-earned/${chain}/${address}/${poolAddress}`,
      { headers: { 'x-api-key': 'test-key' } }
    ).then(res => setData(res.data))
     .finally(() => setLoading(false));
  }, [chain, address, poolAddress]);

  return { data, loading };
}
