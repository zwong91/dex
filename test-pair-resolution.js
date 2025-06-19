// Test LBPair address resolution vs user positions
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const TEST_USER = '0xE0A051f87bb78f38172F633449121475a193fC1A';
const LB_FACTORY = '0x7D73A6eFB91C89502331b2137c2803408838218b';
const LB_ROUTER = '0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98';

// Known pair with user liquidity
const KNOWN_PAIR = '0x5E4c51ab2EAa2fa9dB25Ea4638FfEF3c017Db34B';

const factoryABI = [{
  "inputs": [
    {"internalType": "contract IERC20", "name": "tokenA", "type": "address"},
    {"internalType": "contract IERC20", "name": "tokenB", "type": "address"},
    {"internalType": "uint256", "name": "binStep", "type": "uint256"}
  ],
  "name": "getLBPairInformation",
  "outputs": [
    {"internalType": "contract ILBPair", "name": "lbPair", "type": "address"},
    {"internalType": "bool", "name": "createdByOwner", "type": "bool"},
    {"internalType": "bool", "name": "ignoredForRouting", "type": "bool"}
  ],
  "stateMutability": "view",
  "type": "function"
}];

const lbPairInfoABI = [
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
    "name": "getBinStep",
    "outputs": [{"internalType": "uint16", "name": "", "type": "uint16"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('🔍 Testing LBPair Address Resolution\n');
  
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http('https://bsc-testnet-rpc.publicnode.com')
  });

  try {
    // Step 1: Get token info from known pair
    console.log(`📋 Known pair with user liquidity: ${KNOWN_PAIR}`);
    
    const tokenX = await client.readContract({
      address: KNOWN_PAIR,
      abi: lbPairInfoABI,
      functionName: 'getTokenX'
    });
    
    const tokenY = await client.readContract({
      address: KNOWN_PAIR,
      abi: lbPairInfoABI,
      functionName: 'getTokenY'
    });
    
    const binStep = await client.readContract({
      address: KNOWN_PAIR,
      abi: lbPairInfoABI,
      functionName: 'getBinStep'
    });

    console.log(`   Token X: ${tokenX}`);
    console.log(`   Token Y: ${tokenY}`);
    console.log(`   Bin Step: ${binStep.toString()}`);

    // Step 2: Use factory to get LBPair address for these tokens
    console.log(`\n🏭 Using Factory to get LBPair address...`);
    
    const pairInfo = await client.readContract({
      address: LB_FACTORY,
      abi: factoryABI,
      functionName: 'getLBPairInformation',
      args: [tokenX, tokenY, BigInt(binStep)]
    });

    const [factoryPairAddress, createdByOwner, ignoredForRouting] = pairInfo;
    
    console.log(`   Factory returned pair: ${factoryPairAddress}`);
    console.log(`   Created by owner: ${createdByOwner}`);
    console.log(`   Ignored for routing: ${ignoredForRouting}`);
    
    // Step 3: Compare addresses
    console.log(`\n🔄 Address Comparison:`);
    console.log(`   Known pair:    ${KNOWN_PAIR.toLowerCase()}`);
    console.log(`   Factory pair:  ${factoryPairAddress.toLowerCase()}`);
    console.log(`   Match: ${KNOWN_PAIR.toLowerCase() === factoryPairAddress.toLowerCase() ? '✅ YES' : '❌ NO'}`);

    if (KNOWN_PAIR.toLowerCase() !== factoryPairAddress.toLowerCase()) {
      console.log(`\n⚠️ ISSUE FOUND: Address mismatch!`);
      console.log(`This explains why authorization/withdrawal fails`);
      console.log(`The code is trying to authorize the wrong contract`);
    } else {
      console.log(`\n✅ Addresses match - this is not the issue`);
    }

    // Step 4: Test both pairs for different token orderings
    console.log(`\n🔄 Testing reverse token order...`);
    
    try {
      const reversePairInfo = await client.readContract({
        address: LB_FACTORY,
        abi: factoryABI,
        functionName: 'getLBPairInformation',
        args: [tokenY, tokenX, BigInt(binStep)] // Reversed order
      });

      const [reversePairAddress] = reversePairInfo;
      console.log(`   Reverse order pair: ${reversePairAddress}`);
      console.log(`   Same as known: ${KNOWN_PAIR.toLowerCase() === reversePairAddress.toLowerCase() ? '✅ YES' : '❌ NO'}`);
      
    } catch (reverseError) {
      console.log(`   Reverse order failed: ${reverseError.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);
