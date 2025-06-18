// Price service to fetch real token prices from CoinGecko
export interface TokenPrice {
  price: number
  change24h: number
}

export interface PriceData {
  [symbol: string]: TokenPrice
}

// CoinGecko token ID mapping
const COINGECKO_TOKEN_IDS: { [symbol: string]: string } = {
  'BNB': 'binancecoin',
  'tBNB': 'binancecoin', // Use same price as BNB for testnet
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'WETH': 'ethereum',
  'BTCB': 'bitcoin',
  'BUSD': 'binance-usd',
  'CAKE': 'pancakeswap-token',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
}

class PriceService {
  private cache: Map<string, { data: PriceData; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 60 * 1000 // 1 minute cache
  private readonly API_BASE = 'https://api.coingecko.com/api/v3'

  /**
   * Fetch real-time prices for multiple tokens
   */
  async fetchPrices(symbols: string[]): Promise<PriceData> {
    const cacheKey = symbols.sort().join(',')
    const cached = this.cache.get(cacheKey)
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('💰 Using cached price data')
      return cached.data
    }

    try {
      // Map symbols to CoinGecko IDs
      const tokenIds = symbols
        .map(symbol => COINGECKO_TOKEN_IDS[symbol])
        .filter(Boolean)

      if (tokenIds.length === 0) {
        console.warn('No valid token IDs found for symbols:', symbols)
        return this.getFallbackPrices(symbols)
      }

      console.log('🔄 Fetching real prices from CoinGecko for:', tokenIds)

      const response = await fetch(
        `${this.API_BASE}/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('💰 CoinGecko response:', data)

      // Transform the response to our format
      const priceData: PriceData = {}
      
      symbols.forEach(symbol => {
        const tokenId = COINGECKO_TOKEN_IDS[symbol]
        if (tokenId && data[tokenId]) {
          priceData[symbol] = {
            price: data[tokenId].usd || 0,
            change24h: data[tokenId].usd_24h_change || 0,
          }
        } else {
          // Fallback for tokens not found
          priceData[symbol] = this.getFallbackPrice(symbol)
        }
      })

      // Cache the result
      this.cache.set(cacheKey, {
        data: priceData,
        timestamp: Date.now(),
      })

      console.log('💰 Final price data:', priceData)
      return priceData

    } catch (error) {
      console.error('Error fetching prices from CoinGecko:', error)
      return this.getFallbackPrices(symbols)
    }
  }

  /**
   * Get fallback prices when API is unavailable
   */
  private getFallbackPrices(symbols: string[]): PriceData {
    const fallbackPrices: { [symbol: string]: TokenPrice } = {
      'BNB': { price: 600, change24h: 2.45 },
      'tBNB': { price: 600, change24h: 2.45 }, // Same as BNB for testnet
      'ETH': { price: 3400, change24h: 1.85 },
      'USDC': { price: 1.0, change24h: 0.01 },
      'USDT': { price: 1.0, change24h: 0.01 },
      'WETH': { price: 3400, change24h: 1.85 },
      'BTCB': { price: 50000, change24h: 3.2 },
      'BUSD': { price: 1.0, change24h: 0.0 },
      'CAKE': { price: 2.5, change24h: -1.2 },
      'ADA': { price: 0.45, change24h: 1.8 },
      'DOT': { price: 7.2, change24h: 2.1 },
      'LINK': { price: 15.8, change24h: 0.9 },
      'UNI': { price: 8.5, change24h: -0.5 },
    }

    const result: PriceData = {}
    symbols.forEach(symbol => {
      result[symbol] = fallbackPrices[symbol] || { price: 0, change24h: 0 }
    })

    return result
  }

  /**
   * Get fallback price for a single token
   */
  private getFallbackPrice(symbol: string): TokenPrice {
    return this.getFallbackPrices([symbol])[symbol]
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const priceService = new PriceService()

// Helper function to format price change
export const formatPriceChange = (change: number): string => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

// Helper function to format price
export const formatPrice = (price: number): string => {
  if (price === 0) {
    return '$0.00'
  } else if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`
  } else {
    return `$${price.toFixed(6)}`
  }
}
