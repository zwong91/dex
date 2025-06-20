#!/bin/bash

# 简单的数据库和同步测试脚本

echo "🧪 简单的数据库和同步测试"
echo "========================="

# 检查 wrangler 进程
echo "📋 检查运行中的 wrangler 进程:"
ps aux | grep wrangler | grep -v grep || echo "没有 wrangler 进程在运行"

echo ""
echo "📋 测试数据库连接:"

# 测试数据库连接
curl -s "http://localhost:8787/health" | jq . || echo "❌ 健康检查失败"

echo ""
echo "📋 测试数据库表:"

# 直接查询数据库
echo "SELECT name FROM sqlite_master WHERE type='table';" | \
npx wrangler d1 execute d1-dex-database --local --command || \
echo "❌ 数据库查询失败"

echo ""
echo "📋 检查 pools 表:"

# 检查 pools 表
echo "SELECT COUNT(*) as count FROM pools;" | \
npx wrangler d1 execute d1-dex-database --local --command || \
echo "❌ pools 表查询失败"

echo ""
echo "📋 简单的同步状态检查:"

# 检查同步状态（不启动协调器）
curl -s -X GET "http://localhost:8787/v1/api/admin/sync/status" | jq . || \
echo "❌ 同步状态查询失败"

echo ""
echo "📋 测试完成！"
