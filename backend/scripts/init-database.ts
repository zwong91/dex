#!/usr/bin/env node

/**
 * 数据库初始化脚本
 */

import * as schema from '../src/database/schema.ts';

// 权限数据
const PERMISSIONS_DATA = [
  // DEX API 权限
  { name: 'dex:pools:read', description: '读取流动性池信息', category: 'dex', tier: 'free' },
  { name: 'dex:pools:write', description: '管理流动性池', category: 'dex', tier: 'pro' },
  { name: 'dex:analytics:read', description: '读取DEX分析数据', category: 'dex', tier: 'free' },
  { name: 'dex:analytics:advanced', description: '高级分析数据', category: 'dex', tier: 'basic' },
  { name: 'dex:user:read', description: '读取用户数据', category: 'dex', tier: 'basic' },
  { name: 'dex:user:write', description: '修改用户数据', category: 'dex', tier: 'pro' },
  { name: 'dex:events:read', description: '读取事件数据', category: 'dex', tier: 'basic' },
  { name: 'dex:realtime:subscribe', description: '实时数据订阅', category: 'dex', tier: 'pro' },
  
  // 管理权限
  { name: 'admin:sync:manage', description: '管理数据同步', category: 'admin', tier: 'enterprise' },
  { name: 'admin:pools:manage', description: '管理池配置', category: 'admin', tier: 'enterprise' },
  { name: 'admin:users:read', description: '读取用户信息', category: 'admin', tier: 'enterprise' },
  { name: 'admin:system:status', description: '系统状态监控', category: 'admin', tier: 'enterprise' },
];

async function initializeDatabase(db) {
  console.log('🚀 开始初始化数据库...');

  try {
    // 1. 插入权限数据
    console.log('📋 插入权限数据...');
    for (const permission of PERMISSIONS_DATA) {
      await db.insert(schema.permissions).values({
        name: permission.name,
        description: permission.description,
        category: permission.category,
        tier: permission.tier,
        isActive: true,
        createdAt: Date.now()
      }).onConflictDoNothing();
    }
    console.log(`✅ 插入了 ${PERMISSIONS_DATA.length} 个权限`);

    // 2. 创建管理员用户
    console.log('👤 创建管理员用户...');
    const adminUser = await db.insert(schema.users).values({
      email: 'admin@entysquare.com',
      username: 'admin',
      name: 'System Administrator',
      status: 'active',
      emailVerified: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }).onConflictDoNothing().returning({ id: schema.users.id });

    if (adminUser.length > 0) {
      // 创建管理员API密钥
      const crypto = await import('crypto');
      const key = `dex_admin_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      
      await db.insert(schema.apiKeys).values({
        userId: adminUser[0].id,
        keyHash,
        keyPrefix: `${key.substring(0, 12)}...`,
        name: 'Admin Master Key',
        description: 'Full access admin key',
        tier: 'enterprise',
        status: 'active',
        permissions: JSON.stringify(['admin:*']),
        rateLimitPerHour: 50000,
        rateLimitPerDay: 1000000,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      console.log(`✅ 管理员用户创建成功`);
      console.log(`🔑 管理员API密钥: ${key}`);
      console.log(`⚠️  请保存这个密钥，它不会再次显示！`);
    }

    console.log('🎉 数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
if (process.argv[2] === '--local') {
  // 本地 D1 数据库初始化
  console.log('使用本地 D1 数据库...');
  // TODO: 实现本地 D1 连接
} else {
  console.log('请使用 wrangler d1 execute 命令在云端运行此脚本');
  console.log('或使用 --local 参数在本地运行');
}

export { initializeDatabase, PERMISSIONS_DATA };
