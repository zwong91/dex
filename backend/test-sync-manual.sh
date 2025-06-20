#!/bin/bash

# 手动触发同步的快速测试脚本
echo "🔄 手动触发 DEX 同步逻辑"
echo "========================="

# 配置
LOCAL_URL="http://localhost:55702"  # 当前 wrangler dev 的端口

echo "🏥 1. 检查服务器健康状态..."
curl -s "$LOCAL_URL/health" | jq . || echo "服务器未运行或 jq 未安装"

echo ""
echo "📊 2. 查看同步状态..."
curl -s "$LOCAL_URL/v1/api/admin/sync/status" | jq . || curl -s "$LOCAL_URL/v1/api/admin/sync/status"

echo ""
echo "🏥 3. 查看同步健康状态..."
curl -s "$LOCAL_URL/v1/api/admin/sync/health" | jq . || curl -s "$LOCAL_URL/v1/api/admin/sync/health"

echo ""
echo "🚀 4. 启动同步协调器..."
curl -s -X POST "$LOCAL_URL/v1/api/admin/sync/start" | jq . || curl -s -X POST "$LOCAL_URL/v1/api/admin/sync/start"

echo ""
echo "⏳ 等待 3 秒..."
sleep 3

echo ""
echo "🔄 5. 手动触发完整同步..."
curl -s -X POST "$LOCAL_URL/v1/api/admin/sync/trigger" | jq . || curl -s -X POST "$LOCAL_URL/v1/api/admin/sync/trigger"

echo ""
echo "📈 6. 查看同步指标..."
curl -s "$LOCAL_URL/v1/api/admin/sync/metrics" | jq . || curl -s "$LOCAL_URL/v1/api/admin/sync/metrics"

echo ""
echo "📋 7. 查看同步报告..."
curl -s "$LOCAL_URL/v1/api/admin/sync/report" | jq . || curl -s "$LOCAL_URL/v1/api/admin/sync/report"

echo ""
echo "✅ 同步测试完成！"
echo ""
echo "💡 提示："
echo "- 如果看到 'Sync coordinator not running'，请先调用 /start 端点"
echo "- 查看 wrangler dev 终端的日志以获得更多详细信息"
echo "- 使用 /stop 端点可以停止同步协调器"
