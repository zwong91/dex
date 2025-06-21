#!/usr/bin/env node

// 直接导入并测试池配置
import { 
  getAllPoolAddresses, 
  getHighPriorityPools, 
  DEFAULT_POOL_ADDRESSES,
  TRADER_JOE_POOLS 
} from '../src/dex/sync/pool-config.js';

console.log('🚀 DEX Pool Configuration Test\n');

const allPools = getAllPoolAddresses();
const highPriorityPools = getHighPriorityPools();

console.log('📊 Summary:');
console.log(`   - Total pools: ${allPools.length}`);
console.log(`   - High priority: ${highPriorityPools.length}`);
console.log(`   - Default fallback: ${DEFAULT_POOL_ADDRESSES.length}`);

console.log('\n🏊 All Pool Addresses:');
allPools.forEach((addr, i) => {
  const isHigh = highPriorityPools.includes(addr);
  console.log(`   ${i+1}. ${addr} ${isHigh ? '🔥' : '⚡'}`);
});

console.log('\n⛓️  Chain Distribution:');
Object.entries(TRADER_JOE_POOLS).forEach(([chain, pools]) => {
  console.log(`   ${chain}: ${pools.length} pools`);
});

console.log('\n✅ Pool configuration loaded successfully!');
