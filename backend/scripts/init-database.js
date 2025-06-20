#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 设置权限、创建示例数据等
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../src/database/schema.js';

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

// 示例代币数据
const SAMPLE_TOKENS = [
  // BSC 主网代币
  {
    address: '0x55d398326f99059ff775485246999027b3197955',
    chain: 'binance',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether-logo.png'
  },
  {
    address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    chain: 'binance',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  },
  {
    address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    chain: 'binance',
    name: 'Wrapped BNB',
    symbol: 'WBNB',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/12591/small/binance-coin-logo.png'
  },
  {
    address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    chain: 'binance',
    name: 'BTCB Token',
    symbol: 'BTCB',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/14108/small/Binance-bitcoin.png'
  },
  {
    address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    chain: 'binance',
    name: 'Ethereum Token',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
  },
  
  // BSC 测试网代币
  {
    address: '0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684',
    chain: 'bsctest',
    name: 'Test USD Tether',
    symbol: 'TUSDT',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether-logo.png'
  },
  {
    address: '0x64544969ed7ebf5f083679233325356ebe738930',
    chain: 'bsctest',
    name: 'Test USD Coin',
    symbol: 'TUSDC',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  }
];

// 示例流动性池
const SAMPLE_POOLS = [
  {
    address: '0x1234567890123456789012345678901234567890',
    chain: 'binance',
    tokenX: '0x55d398326f99059ff775485246999027b3197955', // USDT
    tokenY: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
    binStep: 15,
    name: 'USDT/USDC',
    status: 'active',
    version: 'v2.2'
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    chain: 'binance',
    tokenX: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
    tokenY: '0x55d398326f99059ff775485246999027b3197955', // USDT
    binStep: 25,
    name: 'WBNB/USDT',
    status: 'active',
    version: 'v2.2'
  }
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

    // 2. 插入示例代币
    console.log('🪙 插入示例代币...');
    for (const token of SAMPLE_TOKENS) {
      await db.insert(schema.tokens).values({
        address: token.address.toLowerCase(),
        chain: token.chain,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI,
        createdAt: Date.now()
      }).onConflictDoNothing();
    }
    console.log(`✅ 插入了 ${SAMPLE_TOKENS.length} 个代币`);

    // 3. 插入示例流动性池
    console.log('🏊 插入示例流动性池...');
    for (const pool of SAMPLE_POOLS) {
      await db.insert(schema.pools).values({
        address: pool.address.toLowerCase(),
        chain: pool.chain,
        tokenX: pool.tokenX.toLowerCase(),
        tokenY: pool.tokenY.toLowerCase(),
        binStep: pool.binStep,
        name: pool.name,
        status: pool.status,
        version: pool.version,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }).onConflictDoNothing();
    }
    console.log(`✅ 插入了 ${SAMPLE_POOLS.length} 个流动性池`);

    // 4. 创建管理员用户
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

export { initializeDatabase, PERMISSIONS_DATA, SAMPLE_TOKENS, SAMPLE_POOLS };
