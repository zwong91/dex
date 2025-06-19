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
 * NOTE: Distribution calculation functions have been replaced with official LB SDK functions.
 * 
 * Instead of custom implementations, we now use:
 * - getUniformDistributionFromBinRange() from @lb-xyz/sdk-v2
 * 
 * This ensures proper calculation compatibility with the Liquidity Book protocol
 * and eliminates slippage errors caused by incorrect distribution calculations.
 * 
 * The following functions have been removed as they are no longer needed:
 * - calculateSingleSidedBinRange() - replaced by LB SDK's getUniformDistributionFromBinRange()
 * - estimateSingleSidedPriceImpact() - simplified logic now handled directly in components
 * - getRecommendedBinCount() - replaced by simple fixed bin count in useDexOperations
 */
