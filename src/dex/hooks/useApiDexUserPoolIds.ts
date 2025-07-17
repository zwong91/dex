import { useEffect, useState } from 'react';
import axios from 'axios';

export function useApiDexUserPoolIds(address: string, chain: string, pageSize = 10, pageNum = 1) {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !chain) return;
    setLoading(true);
    axios.get(
      `https://api.dex.jongun2038.win/v1/api/dex/user/pool-ids/${address}/${chain}?pageSize=${pageSize}&pageNum=${pageNum}`,
      { headers: { 'x-api-key': 'test-key' } }
    ).then(res => setData(res.data))
     .finally(() => setLoading(false));
  }, [address, chain, pageSize, pageNum]);

  return { data, loading };
}
