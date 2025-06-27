import { useEffect, useState } from 'react';
import axios from 'axios';

export function useApiDexUserBinIds(address: string, chain: string, poolAddress: string) {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !chain || !poolAddress) return;
    setLoading(true);
    axios.get(
      `https://api.dex.jongun2038.win/v1/api/dex/user/bin-ids/${address}/${chain}/${poolAddress}`,
      { headers: { 'x-api-key': 'test-key' } }
    ).then(res => setData(res.data))
     .finally(() => setLoading(false));
  }, [address, chain, poolAddress]);

  return { data, loading };
}
