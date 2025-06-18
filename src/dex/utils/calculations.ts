/**
 * Utility functions for DEX calculations
 */

import { generateTokenIcon } from './tokenIconGenerator'

// Get token icon URL - now uses local SVG generation
export const getTokenIcon = (symbol: string, size: number = 32): string => {
  return generateTokenIcon(symbol, size)
}

// Calculate position value in USD (mock implementation)
export const calculatePositionValue = async (
  token0Symbol: string,
  token1Symbol: string,
  amount0: number,
  amount1: number
): Promise<string> => {
  // Validate inputs - handle NaN, undefined, or invalid numbers
  const safeAmount0 = isFinite(amount0) ? amount0 : 0
  const safeAmount1 = isFinite(amount1) ? amount1 : 0

  console.log('🧮 calculatePositionValue:', {
    token0Symbol,
    token1Symbol,
    originalAmount0: amount0,
    originalAmount1: amount1,
    safeAmount0,
    safeAmount1
  })

  // Mock price data - in production, fetch from price oracle
  const mockPrices: Record<string, number> = {
    BNB: 600,
    USDC: 1,
    USDT: 1,
    ETH: 3400,
    WETH: 3400,
    BTCB: 50000,
    CAKE: 2.5,
  }

  const price0 = mockPrices[token0Symbol.toUpperCase()] || 1
  const price1 = mockPrices[token1Symbol.toUpperCase()] || 1

  const value0 = safeAmount0 * price0
  const value1 = safeAmount1 * price1
  const totalValue = value0 + value1

  // Additional safety check
  if (!isFinite(totalValue) || totalValue < 0) {
    console.warn('⚠️ Invalid totalValue calculated:', { value0, value1, totalValue })
    return '$0.00'
  }

  if (totalValue >= 1000000) {
    return `$${(totalValue / 1000000).toFixed(2)}M`
  } else if (totalValue >= 1000) {
    return `$${(totalValue / 1000).toFixed(2)}K`
  } else {
    return `$${totalValue.toFixed(2)}`
  }
}

// Calculate price range for LB positions
export const calculatePriceRange = async (
  _activeBin: number,
  binStep: number,
  token0Symbol: string,
  token1Symbol: string
): Promise<{ min: number; max: number; current: number }> => {
  // Mock current price based on token pair
  let currentPrice = 1

  if ((token0Symbol === 'USDC' || token0Symbol === 'USDT') && token1Symbol === 'BNB') {
    currentPrice = 1 / 600 // USDC per BNB
  } else if (token0Symbol === 'BNB' && (token1Symbol === 'USDC' || token1Symbol === 'USDT')) {
    currentPrice = 600 // BNB per USDC
  } else if (token0Symbol === 'ETH' && (token1Symbol === 'USDC' || token1Symbol === 'USDT')) {
    currentPrice = 3400
  } else if ((token0Symbol === 'USDC' || token0Symbol === 'USDT') && token1Symbol === 'ETH') {
    currentPrice = 1 / 3400
  }

  // Calculate bin price range (simplified)
  const binStepPercent = binStep / 10000
  const priceRange = currentPrice * binStepPercent * 10 // ±10 bins

  return {
    min: Math.max(0, currentPrice - priceRange),
    max: currentPrice + priceRange,
    current: currentPrice
  }
}

// Calculate realistic fees for a position
export const calculateRealisticFees = async (
  sharePercentage: number,
  binStep: number,
  token0Symbol: string,
  token1Symbol: string,
  positionValueUSD: number
): Promise<{ fees24h: string; feesTotal: string }> => {
  // Base APR based on bin step (higher bin step = more volatile = higher fees)
  const baseAPR = Math.min(binStep / 100, 200) // Cap at 200%
  
  // Adjust for token pair volatility
  let volatilityMultiplier = 1
  if (token0Symbol === 'USDC' && token1Symbol === 'USDT') {
    volatilityMultiplier = 0.1 // Very stable pair
  } else if ((token0Symbol === 'BNB' || token1Symbol === 'BNB') && 
             (token0Symbol === 'USDC' || token1Symbol === 'USDC' || 
              token0Symbol === 'USDT' || token1Symbol === 'USDT')) {
    volatilityMultiplier = 1.5 // Moderate volatility
  } else {
    volatilityMultiplier = 2 // High volatility pairs
  }

  const dailyFeeRate = (baseAPR * volatilityMultiplier / 365) / 100
  const fees24h = positionValueUSD * dailyFeeRate * (sharePercentage / 100)
  const feesTotal = fees24h * 30 // Estimate 30 days of fees

  const formatFees = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}K`
    } else {
      return `$${amount.toFixed(2)}`
    }
  }

  return {
    fees24h: formatFees(fees24h),
    feesTotal: formatFees(feesTotal)
  }
}

// Estimate APR for a position
export const estimateAPR = (
  token0Symbol: string,
  token1Symbol: string,
  binStep: number
): string => {
  // Base APR calculation
  let baseAPR = binStep / 10 // Simple heuristic

  // Adjust for pair type
  if (token0Symbol === 'USDC' && token1Symbol === 'USDT') {
    baseAPR = Math.min(baseAPR, 5) // Stable pairs have lower APR
  } else if ((token0Symbol === 'BNB' || token1Symbol === 'BNB') && 
             (token0Symbol === 'USDC' || token1Symbol === 'USDC' || 
              token0Symbol === 'USDT' || token1Symbol === 'USDT')) {
    baseAPR = Math.min(baseAPR, 50) // Major pairs
  } else {
    baseAPR = Math.min(baseAPR, 100) // Other pairs
  }

  return `${baseAPR.toFixed(1)}%`
}

/**
 * Calculate optimal bin range for single-sided liquidity
 * @param activeBinId Current active bin ID
 * @param isTokenX True if providing tokenX, false for tokenY
 * @param binCount Number of bins to distribute liquidity across
 * @param concentration How concentrated the liquidity should be (1-10, higher = more concentrated)
 * @returns Bin range and delta IDs for single-sided liquidity
 */
export const calculateSingleSidedBinRange = (
  activeBinId: number,
  isTokenX: boolean,
  binCount: number = 5,
  concentration: number = 3
): { binRange: [number, number]; deltaIds: number[] } => {
  // For tokenX (quote token), liquidity should be placed in higher price bins (right side)
  // For tokenY (base token), liquidity should be placed in lower price bins (left side)
  
  const spreadFactor = Math.max(1, Math.floor(binCount / concentration))
  
  let startBin: number, endBin: number
  
  if (isTokenX) {
    // TokenX liquidity goes to the right (higher prices)
    startBin = activeBinId
    endBin = activeBinId + (binCount - 1) * spreadFactor
  } else {
    // TokenY liquidity goes to the left (lower prices)
    endBin = activeBinId
    startBin = activeBinId - (binCount - 1) * spreadFactor
  }
  
  // Generate delta IDs for the range
  const deltaIds: number[] = []
  for (let i = startBin; i <= endBin; i += spreadFactor) {
    deltaIds.push(i - activeBinId)
  }
  
  return {
    binRange: [startBin, endBin],
    deltaIds
  }
}

/**
 * Calculate price impact for single-sided liquidity
 * @param tokenAmount Amount of tokens being provided
 * @param binStep Bin step in basis points
 * @param isTokenX True if providing tokenX
 * @returns Estimated price impact percentage
 */
export const estimateSingleSidedPriceImpact = (
  tokenAmount: number,
  binStep: number,
  isTokenX: boolean
): number => {
  // Simplified price impact calculation
  // In reality, this would require more complex calculations based on liquidity distribution
  const binWidth = binStep / 10000 // Convert basis points to decimal
  const liquidityFactor = Math.log(tokenAmount + 1) / 10 // Logarithmic scaling
  
  // Single-sided liquidity typically has higher price impact
  const baseImpact = liquidityFactor * binWidth * (isTokenX ? 1.2 : 1.1)
  
  return Math.min(baseImpact * 100, 5) // Cap at 5% for safety
}

/**
 * Get recommended bin count based on token amount and market conditions
 * @param tokenAmount Amount of tokens
 * @param volatility Expected volatility (0-1, higher = more volatile)
 * @returns Recommended number of bins
 */
export const getRecommendedBinCount = (
  tokenAmount: number,
  volatility: number = 0.1
): number => {
  // More tokens or higher volatility = spread across more bins
  const baseBinCount = 3
  const volatilityAdjustment = Math.floor(volatility * 10)
  const amountAdjustment = Math.floor(Math.log10(tokenAmount + 1))
  
  return Math.min(Math.max(baseBinCount + volatilityAdjustment + amountAdjustment, 3), 10)
}

/**
 * Create a concentrated distribution (most liquidity in center bins)
 * @param binCount Number of bins
 * @returns Distribution array with higher values in center
 */
export const createConcentratedDistribution = (binCount: number): bigint[] => {
  const distribution: bigint[] = []
  const center = Math.floor(binCount / 2)
  
  for (let i = 0; i < binCount; i++) {
    const distanceFromCenter = Math.abs(i - center)
    // Higher weight for bins closer to center
    const weight = Math.max(1, 10 - distanceFromCenter * 2)
    distribution.push(BigInt(weight * 1000)) // Scale up for precision
  }
  
  return normalizeDistribution(distribution)
}

/**
 * Create a uniform distribution (equal liquidity across all bins)
 * @param binCount Number of bins
 * @returns Distribution array with equal values
 */
export const createUniformDistribution = (binCount: number): bigint[] => {
  const weight = BigInt(10000) // Use 10000 as base weight
  return new Array(binCount).fill(weight)
}

/**
 * Create a weighted distribution (biased towards price direction)
 * @param binCount Number of bins
 * @param isTokenX True if providing tokenX (bias towards higher bins)
 * @returns Distribution array with directional bias
 */
export const createWeightedDistribution = (binCount: number, isTokenX: boolean): bigint[] => {
  const distribution: bigint[] = []
  
  for (let i = 0; i < binCount; i++) {
    let weight: number
    
    if (isTokenX) {
      // For tokenX, bias towards higher indices (right side of curve)
      weight = 5 + (i * 5) // Increasing weight
    } else {
      // For tokenY, bias towards lower indices (left side of curve)
      weight = 5 + ((binCount - 1 - i) * 5) // Decreasing weight
    }
    
    distribution.push(BigInt(weight * 1000))
  }
  
  return normalizeDistribution(distribution)
}

/**
 * Normalize distribution to ensure total equals 10000 (100%)
 * @param distribution Raw distribution array
 * @returns Normalized distribution array
 */
export const normalizeDistribution = (distribution: bigint[]): bigint[] => {
  const total = distribution.reduce((sum, val) => sum + val, BigInt(0))
  if (total === BigInt(0)) {
    return distribution // Avoid division by zero
  }
  
  const target = BigInt(10000) // 100% in basis points
  return distribution.map(val => (val * target) / total)
}
