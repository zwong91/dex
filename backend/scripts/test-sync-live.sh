#!/bin/bash

echo "🔄 测试同步服务 - 写入事件数据到 D1"

cd "$(dirname "$0")/.."

echo "📋 检查初始状态..."

# 查看初始数据
echo "💰 池数量:"
npx wrangler d1 execute d1-dex-database --command="SELECT COUNT(*) as count FROM pools;"

echo "📊 交换事件数量:"
npx wrangler d1 execute d1-dex-database --command="SELECT COUNT(*) as count FROM swap_events;"

echo "🏊 流动性事件数量:"
npx wrangler d1 execute d1-dex-database --command="SELECT COUNT(*) as count FROM liquidity_events;"

echo ""
echo "🚀 现在启动开发服务器来测试同步..."
echo "在浏览器中访问以下URL来触发同步:"
echo "  http://localhost:8787/dex/sync/trigger"
echo "  http://localhost:8787/dex/pools/discover"
echo ""
echo "启动开发服务器..."

# 启动开发服务器（后台）
npx wrangler dev --port 8787 &
WRANGLER_PID=$!

# 等待服务器启动
sleep 5

echo "✅ 开发服务器已启动 (PID: $WRANGLER_PID)"
echo "📡 测试端点..."

# 测试基本端点
echo "测试基本端点..."
curl -s http://localhost:8787/dex/status | jq '.' || echo "端点响应错误"

echo ""
echo "🔍 触发池发现..."
curl -s -X POST http://localhost:8787/dex/pools/discover | jq '.' || echo "池发现请求失败"

echo ""
echo "🔄 触发同步..."
curl -s -X POST http://localhost:8787/dex/sync/trigger | jq '.' || echo "同步请求失败"

# 等待一会儿让同步完成
echo ""
echo "⏳ 等待同步完成..."
sleep 10

echo ""
echo "📋 检查结果..."

echo "📊 交换事件数量:"
npx wrangler d1 execute d1-dex-database --command="SELECT COUNT(*) as count FROM swap_events;"

echo "🏊 流动性事件数量:"
npx wrangler d1 execute d1-dex-database --command="SELECT COUNT(*) as count FROM liquidity_events;"

echo "📈 最新事件 (前3个):"
npx wrangler d1 execute d1-dex-database --command="SELECT pool_address, transaction_hash, amount_in, amount_out, timestamp FROM swap_events ORDER BY timestamp DESC LIMIT 3;"

echo ""
echo "🛑 停止开发服务器..."
kill $WRANGLER_PID

echo "✅ 测试完成！"
