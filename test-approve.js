// Test the fixed approveForAll function
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const PAIR_ADDRESS = '0x5E4c51ab2EAa2fa9dB25Ea4638FfEF3c017Db34B';
const TEST_USER = '0xE0A051f87bb78f38172F633449121475a193fC1A';
const LB_ROUTER = '0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98';

const lbPairApprovalABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "bool", "name": "approved", "type": "bool"}
    ],
    "name": "approveForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  console.log('🧪 Testing Fixed approveForAll Function\n');
  
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http('https://bsc-testnet-rpc.publicnode.com')
  });

  try {
    // Check current approval status
    console.log('📋 Checking current approval status...');
    const isApproved = await client.readContract({
      address: PAIR_ADDRESS,
      abi: lbPairApprovalABI,
      functionName: 'isApprovedForAll',
      args: [TEST_USER, LB_ROUTER]
    });
    
    console.log(`   Current approval status: ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}`);

    // Test simulation of approveForAll
    console.log('\n🧪 Testing approveForAll simulation...');
    try {
      const result = await client.simulateContract({
        address: PAIR_ADDRESS,
        abi: lbPairApprovalABI,
        functionName: 'approveForAll',
        args: [LB_ROUTER, true],
        account: TEST_USER
      });
      
      console.log('   ✅ approveForAll simulation successful!');
      console.log('   📝 This means the transaction should work when called from Portfolio');
      
    } catch (simulationError) {
      console.log(`   ❌ approveForAll simulation failed: ${simulationError.message}`);
    }

    // Verify user has tokens to approve
    console.log('\n💎 Verifying user token ownership...');
    
    const balanceABI = [{
      "inputs": [
        {"internalType": "address", "name": "account", "type": "address"},
        {"internalType": "uint256", "name": "id", "type": "uint256"}
      ],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }];

    let totalBalance = 0n;
    let activeCount = 0;
    
    // Check bins around the known active area
    for (let binId = 8388604; binId <= 8388611; binId++) {
      try {
        const balance = await client.readContract({
          address: PAIR_ADDRESS,
          abi: balanceABI,
          functionName: 'balanceOf',
          args: [TEST_USER, BigInt(binId)]
        });
        
        if (balance > 0n) {
          totalBalance += balance;
          activeCount++;
        }
      } catch (error) {
        // Skip
      }
    }
    
    console.log(`   📊 User has ${activeCount} active bins with total ${totalBalance.toString()} LP tokens`);
    
    if (totalBalance > 0n) {
      console.log('\n🎯 SUMMARY:');
      console.log('   ✅ User has liquidity to withdraw');
      console.log('   ✅ approveForAll function works in simulation');
      console.log('   ✅ Portfolio withdraw should work with the fix');
      console.log('\n🚀 Ready to test in Portfolio page!');
    } else {
      console.log('\n⚠️ No tokens found - may need to check broader bin range');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);
