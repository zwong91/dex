// Debug specific contract functions and interfaces
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const FAILED_PAIR = '0x5E4c51ab2EAa2fa9dB25Ea4638FfEF3c017Db34B';
const TEST_USER = '0xE0A051f87bb78f38172F633449121475a193fC1A';
const LB_ROUTER = '0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98';

// Test different ABI signatures
const erc1155ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "operator", "type": "address"},
      {"internalType": "bool", "name": "approved", "type": "bool"}
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "address", "name": "operator", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// LBPair specific approval functions
const lbPairApprovalABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "bool", "name": "approved", "type": "bool"}
    ],
    "name": "approveForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Generic function signature checker
const functionSignatures = [
  'setApprovalForAll(address,bool)',
  'approveForAll(address,bool)', 
  'approve(address,uint256)',
  'setApprovalForAll(address,address,bool)'
];

async function main() {
  console.log('🔍 Debugging Contract Interface Issues\n');
  
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http('https://bsc-testnet-rpc.publicnode.com')
  });

  try {
    console.log(`Testing contract: ${FAILED_PAIR}`);
    console.log(`User: ${TEST_USER}`);
    console.log(`Router: ${LB_ROUTER}\n`);

    // Test 1: Check if isApprovedForAll works with standard ERC1155
    console.log('📋 Test 1: Standard ERC1155 isApprovedForAll');
    try {
      const isApproved = await client.readContract({
        address: FAILED_PAIR,
        abi: erc1155ABI,
        functionName: 'isApprovedForAll',
        args: [TEST_USER, LB_ROUTER]
      });
      console.log(`   ✅ isApprovedForAll works: ${isApproved}`);
    } catch (error) {
      console.log(`   ❌ Standard isApprovedForAll failed: ${error.message}`);
    }

    // Test 2: Try LBPair specific approval check
    console.log('\n📋 Test 2: LBPair specific approval check');
    try {
      const isApproved = await client.readContract({
        address: FAILED_PAIR,
        abi: lbPairApprovalABI,
        functionName: 'isApprovedForAll',
        args: [TEST_USER, LB_ROUTER]
      });
      console.log(`   ✅ LBPair isApprovedForAll works: ${isApproved}`);
    } catch (error) {
      console.log(`   ❌ LBPair isApprovedForAll failed: ${error.message}`);
    }

    // Test 3: Check contract code to see what functions it actually has
    console.log('\n📋 Test 3: Contract bytecode analysis');
    const contractCode = await client.getBytecode({ address: FAILED_PAIR });
    console.log(`   Contract code length: ${contractCode ? contractCode.length : 0} characters`);
    
    if (contractCode && contractCode.length > 10) {
      console.log('   ✅ Contract exists and has code');
      
      // Check for common function selectors in bytecode
      const selectors = {
        'setApprovalForAll(address,bool)': '0xa22cb465',
        'approveForAll(address,bool)': '0x9b9a2d78', 
        'isApprovedForAll(address,address)': '0xe985e9c5'
      };
      
      console.log('   🔍 Checking for function selectors in bytecode:');
      for (const [funcName, selector] of Object.entries(selectors)) {
        const hasSelector = contractCode.includes(selector.slice(2));
        console.log(`      ${funcName}: ${hasSelector ? '✅ Found' : '❌ Not found'}`);
      }
    } else {
      console.log('   ❌ Contract has no code or doesn\'t exist');
    }

    // Test 4: Try to simulate the failing transaction
    console.log('\n📋 Test 4: Simulate setApprovalForAll transaction');
    try {
      const result = await client.simulateContract({
        address: FAILED_PAIR,
        abi: erc1155ABI,
        functionName: 'setApprovalForAll',
        args: [LB_ROUTER, true],
        account: TEST_USER
      });
      console.log(`   ✅ setApprovalForAll simulation successful`);
    } catch (error) {
      console.log(`   ❌ setApprovalForAll simulation failed: ${error.message}`);
      
      // Try with LBPair specific function
      try {
        const result2 = await client.simulateContract({
          address: FAILED_PAIR,
          abi: lbPairApprovalABI,
          functionName: 'approveForAll',
          args: [LB_ROUTER, true],
          account: TEST_USER
        });
        console.log(`   ✅ approveForAll simulation successful`);
      } catch (error2) {
        console.log(`   ❌ approveForAll simulation also failed: ${error2.message}`);
      }
    }

    // Test 5: Check if user actually owns tokens in this contract
    console.log('\n📋 Test 5: Check user token ownership');
    
    const erc1155BalanceABI = [{
      "inputs": [
        {"internalType": "address", "name": "account", "type": "address"},
        {"internalType": "uint256", "name": "id", "type": "uint256"}
      ],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }];

    // Check bins around 8388607 (from logs)
    let totalBalance = 0n;
    const activeBins = [];
    
    for (let binId = 8388600; binId <= 8388615; binId++) {
      try {
        const balance = await client.readContract({
          address: FAILED_PAIR,
          abi: erc1155BalanceABI,
          functionName: 'balanceOf',
          args: [TEST_USER, BigInt(binId)]
        });
        
        if (balance > 0n) {
          totalBalance += balance;
          activeBins.push({ binId, balance: balance.toString() });
          console.log(`   💎 Bin ${binId}: ${balance.toString()} tokens`);
        }
      } catch (balanceError) {
        // Skip bins that don't exist
      }
    }
    
    console.log(`   📊 Total balance: ${totalBalance.toString()}`);
    console.log(`   📍 Active bins: ${activeBins.length}`);

    if (totalBalance === 0n) {
      console.log('\n⚠️ ISSUE: User has no tokens in this contract!');
      console.log('This explains why setApprovalForAll might fail');
      console.log('User might be trying to approve a contract they don\'t own tokens in');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

main().catch(console.error);
