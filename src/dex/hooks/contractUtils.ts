/**
 * Contract utility functions for DEX operations
 */

import { jsonAbis } from '@lb-xyz/sdk-v2'

export interface PairData {
  activeBin: number
  binStep: number
  reserves: [bigint, bigint]
  totalLiquidity?: bigint // Optional since LB pairs don't have a single total supply
}

// Batch fetch pair data for multiple pairs to improve performance
export const batchFetchPairData = async (
  client: any,
  pairAddresses: string[]
): Promise<Record<string, PairData | null>> => {
  const pairDataMap: Record<string, PairData | null> = {}

  if (!pairAddresses.length) {
    return pairDataMap
  }

  console.log('🔍 Fetching data for pairs:', pairAddresses)

  // Fetch data for each pair
  const pairPromises = pairAddresses.map(async (pairAddress) => {
    try {
      // First, check if the contract exists by getting the code
      const code = await client.getBytecode({ address: pairAddress as `0x${string}` })
      if (!code || code === '0x') {
        console.warn(`⚠️  No contract found at address ${pairAddress}`)
        return {
          pairAddress,
          data: null
        }
      }

      // Get all necessary data for the pair - LB pairs don't have totalSupply
      const [activeBin, binStep, reserves] = await Promise.all([
        client.readContract({
          address: pairAddress as `0x${string}`,
          abi: [{
            inputs: [],
            name: 'getActiveId',
            outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'getActiveId'
        }),
        client.readContract({
          address: pairAddress as `0x${string}`,
          abi: [{
            inputs: [],
            name: 'getBinStep',
            outputs: [{ internalType: 'uint16', name: '', type: 'uint16' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'getBinStep'
        }),
        client.readContract({
          address: pairAddress as `0x${string}`,
          abi: jsonAbis.LBPairV21ABI,
          functionName: 'getReserves'
        })
      ])

      return {
        pairAddress,
        data: {
          activeBin: Number(activeBin),
          binStep: Number(binStep),
          reserves: reserves as [bigint, bigint],
          totalLiquidity: undefined // LB pairs don't have a single total supply
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch data for pair ${pairAddress}:`, error)
      return {
        pairAddress,
        data: null
      }
    }
  })

  const results = await Promise.all(pairPromises)
  const successfulResults = results.filter(r => r.data !== null)
  
  console.log(`📊 Successfully fetched data for ${successfulResults.length}/${pairAddresses.length} pairs`)
  
  // Build the result map
  results.forEach(result => {
    pairDataMap[result.pairAddress] = result.data
  })

  return pairDataMap
}
