// Test script to verify fixed withdrawal logic
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

// Contract addresses from LB SDK
const LB_ROUTER_ADDRESS = '0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98';
const LB_FACTORY_ADDRESS = '0x7D73A6eFB91C89502331b2137c2803408838218b';

// Test user address (from failed transactions)
const TEST_USER_ADDRESS = '0xE0A051f87bb78f38172F633449121475a193fC1A';

// ERC1155 ABI for LBPair
const ERC1155_ABI = [
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

// LBPair Info ABI
const LBPAIR_INFO_ABI = [
  {
    "inputs": [],
    "name": "getTokenX",
    "outputs": [{"internalType": "contract IERC20", "name": "tokenX", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenY",
    "outputs": [{"internalType": "contract IERC20", "name": "tokenY", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveId",
    "outputs": [{"internalType": "uint24", "name": "", "type": "uint24"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBinStep",
    "outputs": [{"internalType": "uint16", "name": "", "type": "uint16"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('🧪 Testing Fixed Withdrawal Logic\n');
  
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http('https://bsc-testnet-rpc.publicnode.com')
  });

  try {
    // Test basic connectivity
    const blockNumber = await client.getBlockNumber();
    console.log('✅ RPC Connection successful, block:', blockNumber.toString());

    // Check user's BNB balance
    const userBalance = await client.getBalance({ address: TEST_USER_ADDRESS });
    console.log(`💰 User BNB Balance: ${(Number(userBalance) / 1e18).toFixed(6)} BNB`);
    
    if (userBalance < 10000000000000000n) { // Less than 0.01 BNB
      console.log('⚠️ Warning: Low BNB balance may cause transaction failures');
    }

    // Get all LB pairs
    const numberOfPairs = await client.readContract({
      address: LB_FACTORY_ADDRESS,
      abi: [{
        "inputs": [],
        "name": "getNumberOfLBPairs",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: 'getNumberOfLBPairs'
    });

    console.log(`\n📊 Found ${numberOfPairs.toString()} LB pairs on testnet`);

    // Check user's liquidity positions
    let foundPositions = 0;
    const maxPairsToCheck = Math.min(Number(numberOfPairs), 5);

    for (let i = 0; i < maxPairsToCheck; i++) {
      try {
        // Get pair address
        const pairAddress = await client.readContract({
          address: LB_FACTORY_ADDRESS,
          abi: [{
            "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "name": "getLBPairAtIndex",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
          }],
          functionName: 'getLBPairAtIndex',
          args: [BigInt(i)]
        });

        // Get pair info
        const [tokenX, tokenY, activeId, binStep] = await Promise.all([
          client.readContract({
            address: pairAddress,
            abi: LBPAIR_INFO_ABI,
            functionName: 'getTokenX'
          }),
          client.readContract({
            address: pairAddress,
            abi: LBPAIR_INFO_ABI,
            functionName: 'getTokenY'
          }),
          client.readContract({
            address: pairAddress,
            abi: LBPAIR_INFO_ABI,
            functionName: 'getActiveId'
          }),
          client.readContract({
            address: pairAddress,
            abi: LBPAIR_INFO_ABI,
            functionName: 'getBinStep'
          })
        ]);

        console.log(`\n🔍 Checking Pair ${i + 1}: ${pairAddress}`);
        console.log(`   Token X: ${tokenX}`);
        console.log(`   Token Y: ${tokenY}`);
        console.log(`   Active ID: ${activeId.toString()}`);
        console.log(`   Bin Step: ${binStep.toString()}`);

        // Check user's approval status
        const isApproved = await client.readContract({
          address: pairAddress,
          abi: ERC1155_ABI,
          functionName: 'isApprovedForAll',
          args: [TEST_USER_ADDRESS, LB_ROUTER_ADDRESS]
        });

        console.log(`   📋 Router Approval Status: ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}`);

        // Check balances around active bin
        const binRange = 20; // Check ±20 bins around active
        let totalUserBalance = 0n;
        const userBins = [];

        for (let binOffset = -binRange; binOffset <= binRange; binOffset++) {
          try {
            const binId = Number(activeId) + binOffset;
            if (binId >= 0) { // Ensure bin ID is valid
              const balance = await client.readContract({
                address: pairAddress,
                abi: ERC1155_ABI,
                functionName: 'balanceOf',
                args: [TEST_USER_ADDRESS, BigInt(binId)]
              });

              if (balance > 0n) {
                totalUserBalance += balance;
                userBins.push({ binId, balance: balance.toString() });
                console.log(`   💎 Bin ${binId}: ${balance.toString()} LP tokens`);
              }
            }
          } catch (balanceError) {
            // Skip bins that fail (normal for non-existent bins)
          }
        }

        if (totalUserBalance > 0n) {
          foundPositions++;
          console.log(`   🎯 FOUND LIQUIDITY POSITION!`);
          console.log(`   📊 Total Balance: ${totalUserBalance.toString()} LP tokens`);
          console.log(`   📍 Active Bins: ${userBins.length}`);
          
          // This pair has the user's liquidity - this is where withdrawal would happen
          if (!isApproved) {
            console.log(`   ⚠️ ISSUE: Router not approved - this would cause setApprovalForAll transaction`);
            console.log(`   💡 Fix: Need to call setApprovalForAll(${LB_ROUTER_ADDRESS}, true) first`);
          } else {
            console.log(`   ✅ Router approved - withdrawal should work`);
          }
          
          // Test withdrawal parameters
          console.log(`   🧪 Testing withdrawal parameters:`);
          console.log(`   - Pair Address: ${pairAddress}`);
          console.log(`   - Token X: ${tokenX}`);
          console.log(`   - Token Y: ${tokenY}`);
          console.log(`   - Bin Step: ${binStep.toString()}`);
          console.log(`   - User Bins: ${userBins.map(b => b.binId).join(', ')}`);
          console.log(`   - Amounts: ${userBins.map(b => b.balance).join(', ')}`);
        }

      } catch (pairError) {
        console.log(`   ❌ Error checking pair ${i + 1}:`, pairError.message);
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Total Pairs Checked: ${maxPairsToCheck}`);
    console.log(`   Positions Found: ${foundPositions}`);
    
    if (foundPositions === 0) {
      console.log(`   ℹ️ No liquidity positions found for user: ${TEST_USER_ADDRESS}`);
      console.log(`   💡 This could mean:`);
      console.log(`      - User has no liquidity positions`);
      console.log(`      - Liquidity is in bins outside the checked range`);
      console.log(`      - Different user address than expected`);
    } else {
      console.log(`   ✅ Found ${foundPositions} position(s) that can be withdrawn`);
    }

  } catch (error) {
    console.error('❌ Test script error:', error);
  }
}

// Run the test
main().catch(console.error);
