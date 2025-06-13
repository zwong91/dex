export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface PairInfo {
  token0: TokenInfo;
  token1: TokenInfo;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
}

export interface SwapTransaction {
  id: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: Date;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface LiquidityTransaction {
  id: string;
  user: string;
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  liquidity: string;
  timestamp: Date;
  txHash: string;
  type: 'add' | 'remove';
  status: 'pending' | 'completed' | 'failed';
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface DEXStats {
  totalValueLocked: string;
  volume24h: string;
  totalTransactions: number;
  activePairs: number;
}
