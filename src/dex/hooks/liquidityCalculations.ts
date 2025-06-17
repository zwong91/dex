/**
 * Liquidity calculation utilities for DEX operations
 */

// Calculate actual LP share percentage based on user balance and total supply
export const calculateActualLPShare = (
  userLPBalance: bigint,
  totalSupply: bigint,
  _activeBin: number
): number => {
  // Avoid division by zero
  if (totalSupply === BigInt(0)) {
    return 0
  }

  // Calculate percentage of total supply
  const sharePercentage = (Number(userLPBalance) / Number(totalSupply)) * 100

  // For LB pairs, the share might be concentrated in specific bins
  // This is a simplified calculation - in reality, you'd need to account for
  // which specific bins the user has liquidity in
  
  return Math.min(sharePercentage, 100) // Cap at 100%
}

// Calculate liquidity value in a specific bin
export const calculateBinLiquidity = (
  binId: number,
  activeBin: number,
  userBalance: bigint,
  _binStep: number
): number => {
  // Distance from active bin affects liquidity value
  const binDistance = Math.abs(binId - activeBin)
  const distanceMultiplier = Math.max(0.1, 1 - (binDistance * 0.1))
  
  return Number(userBalance) * distanceMultiplier
}

// Calculate total liquidity across multiple bins
export const calculateTotalLiquidity = (
  binBalances: { binId: number; balance: bigint }[],
  activeBin: number,
  binStep: number
): number => {
  return binBalances.reduce((total, { binId, balance }) => {
    const binLiquidity = calculateBinLiquidity(binId, activeBin, balance, binStep)
    return total + binLiquidity
  }, 0)
}

// Calculate impermanent loss for a position
export const calculateImpermanentLoss = (
  initialPriceRatio: number,
  currentPriceRatio: number
): number => {
  if (initialPriceRatio === 0) return 0
  
  const priceChange = currentPriceRatio / initialPriceRatio
  const sqrtPriceChange = Math.sqrt(priceChange)
  
  const portfolioValue = 2 * sqrtPriceChange / (1 + priceChange)
  const impermanentLoss = (portfolioValue - 1) * 100
  
  return impermanentLoss
}
