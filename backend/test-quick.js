const { getAllPoolAddresses, getHighPriorityPools, DEFAULT_POOL_ADDRESSES } = require('./dist/dex/sync/pool-config.js');

console.log('🧪 Quick Pool Config Test\n');
console.log('All pools:', getAllPoolAddresses().length);
console.log('High priority:', getHighPriorityPools().length);
console.log('Default pools:', DEFAULT_POOL_ADDRESSES.length);
console.log('\nPool addresses:');
getAllPoolAddresses().forEach((addr, i) => console.log(`${i+1}. ${addr}`));
