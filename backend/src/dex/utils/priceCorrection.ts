/**
 * Price correction utilities for fixing Oracle price issues
 */

// Known stable tokens that should be $1
const STABLE_TOKENS: Record<string, string> = {
  '0x64544969ed7EBf5f083679233325356EbE738930': 'USDC', // BSC Testnet USDC
  '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd': 'USDT', // BSC Testnet USDT
};

/**
 * Apply price corrections for known problematic tokens
 */
export function correctTokenPrice(tokenAddress: string, oraclePrice: number, symbol?: string): number {
  const normalizedAddress = tokenAddress.toLowerCase();
  
  // Fix stable tokens to $1
  if (STABLE_TOKENS[normalizedAddress] || (symbol && ['USDC', 'USDT', 'DAI', 'BUSD'].includes(symbol))) {
    console.log(`🔧 Correcting ${symbol || 'stable token'} price from ${oraclePrice} to 1.0`);
    return 1.0;
  }
  
  return oraclePrice;
}

/**
 * Recalculate TVL using corrected prices
 */
export function recalculateTVL(pool: any): number {
  const tokenXAddress = pool.tokenX?.id || pool.tokenX?.address;
  const tokenYAddress = pool.tokenY?.id || pool.tokenY?.address;
  
  const correctedXPrice = correctTokenPrice(tokenXAddress, parseFloat(pool.tokenXPriceUSD || '0'), pool.tokenX?.symbol);
  const correctedYPrice = correctTokenPrice(tokenYAddress, parseFloat(pool.tokenYPriceUSD || '0'), pool.tokenY?.symbol);
  
  const reserveX = parseFloat(pool.reserveX || '0');
  const reserveY = parseFloat(pool.reserveY || '0');
  
  const correctedTVL = (reserveX * correctedXPrice) + (reserveY * correctedYPrice);
  
  if (correctedTVL !== parseFloat(pool.totalValueLockedUSD || '0')) {
    console.log(`🔧 TVL corrected for pool ${pool.id}: ${pool.totalValueLockedUSD} → ${correctedTVL.toFixed(2)}`);
  }
  
  return correctedTVL;
}
