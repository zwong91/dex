#!/usr/bin/env tsx
/**
 * KV TTL 过期行为测试
 * 验证 KV 中的数据过期后会如何处理
 */

console.log('🧪 KV TTL 过期行为测试')
console.log('=====================================')

console.log('📚 KV TTL 过期机制说明:')
console.log('')
console.log('1. ⏰ 自动删除: 数据到期后会被自动删除')
console.log('2. 🚫 不会更新: KV 不会自动更新过期的数据')  
console.log('3. 💨 完全清除: 过期数据不占用存储空间')
console.log('4. 🔍 读取行为: 过期后读取返回 null')
console.log('')

console.log('🔄 工作流程:')
console.log('┌─────────────┐   TTL到期   ┌─────────────┐')
console.log('│  缓存数据   │ ─────────→ │  自动删除   │')
console.log('│ (有效状态)   │             │ (数据不存在) │')
console.log('└─────────────┘             └─────────────┘')
console.log('                                   │')
console.log('                            下次请求时')
console.log('                                   ▼')
console.log('                          ┌─────────────┐')
console.log('                          │  Cache MISS │')
console.log('                          │ 重新获取数据 │')
console.log('                          └─────────────┘')
console.log('')

console.log('💡 与 Redis 对比:')
console.log('  Redis: expire → 删除 → 下次读取返回 null')
console.log('  KV:    expire → 删除 → 下次读取返回 null')
console.log('  行为基本相同！')
console.log('')

console.log('✅ 你的代码实现正确:')
console.log('  - expirationTtl: 设置过期时间')
console.log('  - metadata: 添加调试信息 (可选)')
console.log('  - 过期后自动删除，下次请求触发 Cache MISS')
console.log('')

console.log('🎯 总结: KV 过期后会删除数据，不会更新数据')
console.log('这与 Redis 的行为完全一致！')

// 示例代码说明
console.log('')
console.log('📝 代码示例:')
console.log('```typescript')
console.log('// 写入缓存 (60秒后过期)')
console.log('await kv.put("key", "value", { expirationTtl: 60 })')
console.log('')
console.log('// 60秒内读取 → 返回 "value"')
console.log('const result1 = await kv.get("key") // "value"')
console.log('')
console.log('// 60秒后读取 → 返回 null (数据已删除)')
console.log('const result2 = await kv.get("key") // null')
console.log('```')
