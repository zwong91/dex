/**
 * Utility functions for formatting numbers, prices, and percentages
 */

// Format token balances with appropriate decimal places
export const formatTokenBalance = (value: number, symbol: string): string => {
  if (value === 0) return `0 ${symbol}`
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M ${symbol}`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K ${symbol}`
  } else if (value >= 1) {
    return `${value.toFixed(2)} ${symbol}`
  } else if (value >= 0.01) {
    return `${value.toFixed(4)} ${symbol}`
  } else {
    return `${value.toFixed(6)} ${symbol}`
  }
}

// Format USD values
export const formatUSDValue = (value: number): string => {
  if (value === 0) return '$0.00'
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`
  } else {
    return `$${value.toFixed(4)}`
  }
}

// Format large numbers with K, M, B suffixes
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`
  } else {
    return value.toFixed(2)
  }
}

// Format percentage values
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`
}

// Format price values with appropriate decimal places
export const formatPrice = (value: number): string => {
  if (value >= 1000) {
    return value.toFixed(2)
  } else if (value >= 1) {
    return value.toFixed(4)
  } else {
    return value.toFixed(6)
  }
}

// Safely convert BigInt to number with proper decimal handling
export const safeBigIntToNumber = (value: bigint, decimals: number = 18): number => {
  try {
    // Convert to string to avoid precision loss with very large numbers
    const valueStr = value.toString()
    const divisor = Math.pow(10, decimals)
    
    // Handle very large numbers by using string manipulation
    if (valueStr.length > 15) {
      const integerPart = valueStr.slice(0, -decimals) || '0'
      const fractionalPart = valueStr.slice(-decimals).padStart(decimals, '0')
      const truncatedFractional = fractionalPart.slice(0, 6) // Keep 6 decimal places
      return parseFloat(`${integerPart}.${truncatedFractional}`)
    }
    
    return Number(value) / divisor
  } catch (error) {
    console.warn('Error converting BigInt to number:', error)
    return 0
  }
}

// Format currency values with $ prefix
export const formatCurrency = (value: number): string => {
  return `$${formatLargeNumber(value)}`
}

// Format token amounts with appropriate decimal places
export const formatTokenAmount = (value: number, decimals: number = 6): string => {
  return value.toFixed(decimals)
}
