#!/usr/bin/env node

// Debug script to test LB contract interactions on BSC testnet
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

// LB SDK addresses for BSC testnet
const LB_ROUTER_ADDRESS = '0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98';
const LB_FACTORY_ADDRESS = '0x7D73A6eFB91C89502331b2137c2803408838218b';

// Test user wallet (replace with actual address)
const TEST_USER_ADDRESS = '0x1234567890123456789012345678901234567890'; // Replace with real address

async function main() {
  console.log('🔍 Debug: LB Contract Interactions on BSC Testnet\n');
  
  // Create client
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http('https://bsc-testnet-rpc.publicnode.com')
  });

  try {
    // Test basic connectivity
    const blockNumber = await client.getBlockNumber();
    console.log('✅ RPC Connection successful, block:', blockNumber);
    
    // Test factory contract
    console.log('\n📋 Testing LB Factory Contract...');
    console.log('Factory Address:', LB_FACTORY_ADDRESS);
    
    try {
      const factoryABI = [{
        "inputs": [],
        "name": "getNumberOfLBPairs",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }];
      
      const numberOfPairs = await client.readContract({
        address: LB_FACTORY_ADDRESS,
        abi: factoryABI,
        functionName: 'getNumberOfLBPairs'
      });
      
      console.log('✅ Factory contract accessible, pairs:', numberOfPairs.toString());
      
      // Get first pair if exists
      if (numberOfPairs > 0) {
        const getPairABI = [{
          "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "name": "getLBPairAtIndex",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }];
        
        const firstPairAddress = await client.readContract({
          address: LB_FACTORY_ADDRESS,
          abi: getPairABI,
          functionName: 'getLBPairAtIndex',
          args: [0n]
        });
        
        console.log('✅ First pair address:', firstPairAddress);
        
        // Test pair contract
        if (firstPairAddress !== '0x0000000000000000000000000000000000000000') {
          console.log('\n📋 Testing LB Pair Contract...');
          
          const pairABI = [
            {
              "inputs": [],
              "name": "getActiveId",
              "outputs": [{"internalType": "uint24", "name": "", "type": "uint24"}],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [],
              "name": "getTokenX",
              "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [],
              "name": "getTokenY",
              "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
              "stateMutability": "view",
              "type": "function"
            }
          ];
          
          try {
            const [activeId, tokenX, tokenY] = await Promise.all([
              client.readContract({
                address: firstPairAddress,
                abi: pairABI,
                functionName: 'getActiveId'
              }),
              client.readContract({
                address: firstPairAddress,
                abi: pairABI,
                functionName: 'getTokenX'
              }),
              client.readContract({
                address: firstPairAddress,
                abi: pairABI,
                functionName: 'getTokenY'
              })
            ]);
            
            console.log('✅ Pair contract accessible');
            console.log('   Active ID:', activeId.toString());
            console.log('   Token X:', tokenX);
            console.log('   Token Y:', tokenY);
            
          } catch (pairError) {
            console.error('❌ Pair contract error:', pairError.message);
          }
        }
      }
      
    } catch (factoryError) {
      console.error('❌ Factory contract error:', factoryError.message);
    }
    
    // Test router contract
    console.log('\n📋 Testing LB Router Contract...');
    console.log('Router Address:', LB_ROUTER_ADDRESS);
    
    try {
      // Check if router contract exists
      const routerCode = await client.getBytecode({ address: LB_ROUTER_ADDRESS });
      if (routerCode && routerCode !== '0x') {
        console.log('✅ Router contract deployed and has bytecode');
      } else {
        console.error('❌ Router contract not deployed or has no bytecode');
      }
    } catch (routerError) {
      console.error('❌ Router contract error:', routerError.message);
    }
    
    console.log('\n🔍 Contract Addresses Summary:');
    console.log('Router V22:', LB_ROUTER_ADDRESS);
    console.log('Factory V22:', LB_FACTORY_ADDRESS);
    console.log('Chain ID: 97 (BSC Testnet)');
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message);
  }
}

// Run if called directly
main().catch(console.error);
