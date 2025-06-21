import { 
  getAllPoolAddresses, 
  getHighPriorityPools, 
  DEFAULT_POOL_ADDRESSES,
  TRADER_JOE_POOLS 
} from '../src/dex/sync/pool-config';

console.log('🧪 Testing pool configuration...\n');

// 测试配置池地址
const allPools = getAllPoolAddresses();
const highPriorityPools = getHighPriorityPools();

console.log('📊 Pool Configuration Summary:');
console.log(`   Total configured pools: ${allPools.length}`);
console.log(`   High priority pools: ${highPriorityPools.length}`);
console.log(`   Default fallback pools: ${DEFAULT_POOL_ADDRESSES.length}`);
console.log('');

console.log('🏊 Configured Pool Addresses:');
allPools.forEach((address, index) => {
  const isHighPriority = highPriorityPools.includes(address);
  const priority = isHighPriority ? '🔥 HIGH' : '⚡ MEDIUM/LOW';
  console.log(`   ${index + 1}. ${address} (${priority})`);
});

console.log('');
console.log('🎯 High Priority Pools:');
highPriorityPools.forEach((address, index) => {
  console.log(`   ${index + 1}. ${address}`);
});

console.log('');
console.log('🔄 Default Fallback Pools:');
DEFAULT_POOL_ADDRESSES.forEach((address, index) => {
  console.log(`   ${index + 1}. ${address}`);
});

console.log('');
console.log('⛓️  Chain Distribution:');
Object.entries(TRADER_JOE_POOLS).forEach(([chain, pools]) => {
  console.log(`   ${chain}: ${pools.length} pools`);
});

console.log('');
console.log('✅ Pool configuration test completed!');

// 验证地址格式
const invalidAddresses = allPools.filter(addr => !addr.match(/^0x[a-fA-F0-9]{40}$/));
if (invalidAddresses.length > 0) {
  console.log('');
  console.log('❌ Invalid address formats found:');
  invalidAddresses.forEach(addr => console.log(`   ${addr}`));
} else {
  console.log('✅ All pool addresses have valid format');
}

console.log('');
console.log('🚀 Ready to sync pools!');
