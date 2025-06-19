// Quick test to debug Portfolio withdraw functionality
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

// Known test user address
const TEST_USER = '0xE0A051f87bb78f38172F633449121475a193fC1A';
const LB_ROUTER = '0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98';

// Test pairs where user has liquidity
const TEST_PAIRS = [
  '0x5E4c51ab2EAa2fa9dB25Ea4638FfEF3c017Db34B', // BNB/USDC
  '0xf2a0388ae50204FbF4940a82b9312c58eD91E658', // USDC/BNB  
  '0x406Ca3B0acD27b8060c84902d2B0CAB6F5Ad898D'  // BNB/USDT
];

const erc1155ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "address", "name": "operator", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "uint256", "name": "id", "type": "uint256"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('🧪 Portfolio Withdraw Debug Test\n');
  
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http('https://bsc-testnet-rpc.publicnode.com')
  });

  try {
    console.log(`Testing user: ${TEST_USER}`);
    console.log(`Router address: ${LB_ROUTER}\n`);

    for (const pairAddress of TEST_PAIRS) {
      console.log(`\n🔍 Testing Pair: ${pairAddress}`);
      
      try {
        // Check approval status
        const isApproved = await client.readContract({
          address: pairAddress,
          abi: erc1155ABI,
          functionName: 'isApprovedForAll',
          args: [TEST_USER, LB_ROUTER]
        });

        console.log(`   Router Approval: ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}`);

        // Check user balances in some bins
        let hasLiquidity = false;
        const activeBins = [];

        // Check bins around likely active range (8388608 is middle)
        const centerBin = 8388608;
        for (let offset = -10; offset <= 10; offset++) {
          try {
            const binId = centerBin + offset;
            const balance = await client.readContract({
              address: pairAddress,
              abi: erc1155ABI,
              functionName: 'balanceOf',
              args: [TEST_USER, BigInt(binId)]
            });

            if (balance > 0n) {
              hasLiquidity = true;
              activeBins.push({ binId, balance: balance.toString() });
              console.log(`   💎 Bin ${binId}: ${balance.toString()} LP tokens`);
            }
          } catch (binError) {
            // Skip - bin doesn't exist or other error
          }
        }

        if (!hasLiquidity) {
          console.log(`   ℹ️ No liquidity found in checked bins`);
        } else {
          console.log(`   📊 Found liquidity in ${activeBins.length} bins`);
          
          // Simulate withdrawal parameters that Portfolio would use
          const binIds = activeBins.map(b => b.binId);
          const amounts = activeBins.map(b => BigInt(b.balance));
          
          console.log(`   🎯 Withdraw Parameters:`);
          console.log(`      Bin IDs: ${binIds.join(', ')}`);
          console.log(`      Amounts: ${amounts.map(a => a.toString()).join(', ')}`);
          
          if (!isApproved) {
            console.log(`   ⚠️ ISSUE: Would need setApprovalForAll first`);
          } else {
            console.log(`   ✅ Ready for withdrawal`);
          }
        }

      } catch (pairError) {
        console.log(`   ❌ Error testing pair: ${pairError.message}`);
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`This test checks the same conditions that Portfolio page uses`);
    console.log(`If pairs show liquidity but aren't approved, that's the issue`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);
