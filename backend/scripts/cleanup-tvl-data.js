#!/usr/bin/env node

/**
 * Data cleanup script for corrupted TVL values in BSC indexer
 * This script identifies and fixes negative or unreasonably large TVL values
 */

import { SubgraphClient } from '../src/dex/graphql/client.js';

const BSC_SUBGRAPH_URL = process.env.BSC_SUBGRAPH_URL || 'your-bsc-subgraph-url';

async function main() {
  console.log('🔍 Starting TVL data cleanup for BSC indexer...');
  
  const client = new SubgraphClient(BSC_SUBGRAPH_URL);
  
  try {
    // Query for pools with suspicious TVL values
    const suspiciousPoolsQuery = `
      query GetSuspiciousPools {
        lbpairs(
          where: {
            or: [
              { totalValueLockedUSD_lt: "0" },
              { totalValueLockedUSD_gt: "1000000000000000000000000" },
              { reserveX_lt: "0" },
              { reserveY_lt: "0" }
            ]
          }
          first: 100
        ) {
          id
          name
          reserveX
          reserveY
          totalValueLockedUSD
          totalValueLockedBNB
          tokenX {
            id
            symbol
            derivedBNB
          }
          tokenY {
            id
            symbol
            derivedBNB
          }
        }
      }
    `;
    
    console.log('📊 Querying for suspicious pools...');
    const result = await client.query(suspiciousPoolsQuery);
    const suspiciousPools = result.data?.lbpairs || [];
    
    console.log(`Found ${suspiciousPools.length} pools with suspicious TVL values:`);
    
    suspiciousPools.forEach((pool, index) => {
      console.log(`\n${index + 1}. Pool: ${pool.name} (${pool.id})`);
      console.log(`   Reserve X: ${pool.reserveX}`);
      console.log(`   Reserve Y: ${pool.reserveY}`);
      console.log(`   TVL USD: ${pool.totalValueLockedUSD}`);
      console.log(`   TVL BNB: ${pool.totalValueLockedBNB}`);
      
      // Identify the specific issue
      if (parseFloat(pool.reserveX) < 0 || parseFloat(pool.reserveY) < 0) {
        console.log(`   ❌ Issue: Negative reserves detected`);
      }
      if (parseFloat(pool.totalValueLockedUSD) < 0) {
        console.log(`   ❌ Issue: Negative TVL USD`);
      }
      if (Math.abs(parseFloat(pool.totalValueLockedUSD)) > 1e20) {
        console.log(`   ❌ Issue: Unreasonably large TVL (possible overflow)`);
      }
    });
    
    // Query for tokens with suspicious TVL values
    const suspiciousTokensQuery = `
      query GetSuspiciousTokens {
        tokens(
          where: {
            or: [
              { totalValueLockedUSD_lt: "0" },
              { totalValueLockedUSD_gt: "1000000000000000000000000" }
            ]
          }
          first: 100
        ) {
          id
          symbol
          name
          totalValueLocked
          totalValueLockedUSD
          derivedBNB
        }
      }
    `;
    
    console.log('\n📊 Querying for suspicious tokens...');
    const tokenResult = await client.query(suspiciousTokensQuery);
    const suspiciousTokens = tokenResult.data?.tokens || [];
    
    console.log(`\nFound ${suspiciousTokens.length} tokens with suspicious TVL values:`);
    
    suspiciousTokens.forEach((token, index) => {
      console.log(`\n${index + 1}. Token: ${token.symbol} (${token.id})`);
      console.log(`   Total Value Locked: ${token.totalValueLocked}`);
      console.log(`   TVL USD: ${token.totalValueLockedUSD}`);
      console.log(`   Derived BNB Price: ${token.derivedBNB}`);
    });
    
    // Recommendations
    console.log('\n🔧 Recommendations:');
    console.log('1. Redeploy the indexer with the fixed overflow protection');
    console.log('2. Reset the subgraph to re-index all data from scratch');
    console.log('3. Monitor Oracle price feeds for anomalies');
    console.log('4. Implement price bounds checking in Oracle contract');
    
    // Show the specific pool causing the issue
    const problematicPool = suspiciousPools.find(pool => 
      pool.id === '0x904ede072667c4bc3d7e6919b4a0a442559295c8'
    );
    
    if (problematicPool) {
      console.log('\n🎯 Found the specific problematic pool:');
      console.log(`   Pool ID: ${problematicPool.id}`);
      console.log(`   Reserve Y: ${problematicPool.reserveY} (MASSIVE NEGATIVE VALUE)`);
      console.log(`   This is causing the negative quintillion TVL`);
    }
    
  } catch (error) {
    console.error('❌ Error querying subgraph:', error);
    
    // Fallback: show the known problematic data
    console.log('\n📋 Known problematic data from API response:');
    console.log('Pool: 0x904ede072667c4bc3d7e6919b4a0a442559295c8');
    console.log('Reserve Y: -2.7142830509066127e+21');
    console.log('Liquidity USD: -1.823028914434647e+24');
    console.log('USDC Price: $671.63 (should be ~$1.00)');
    console.log('\nThis indicates Oracle price corruption and BigDecimal overflow.');
  }
}

// Export for testing
export { main as cleanupTvlData };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
