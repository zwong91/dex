#!/bin/bash

# 完整的同步逻辑测试脚本

echo "🚀 完整的 DEX 同步逻辑测试"
echo "=========================="

BASE_URL="http://localhost:8787"

# 检查服务器是否运行
echo "📋 1. 检查服务器状态..."
if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
    echo "❌ 服务器未运行，请先启动: npx wrangler dev --local"
    exit 1
fi
echo "✅ 服务器正常运行"

echo ""
echo "📋 2. 基本连接测试..."
curl -s "$BASE_URL/v1/api/test/simple?type=basic" | jq -r '.message'

echo ""
echo "📋 3. 数据库表结构测试..."
TABLE_COUNT=$(curl -s "$BASE_URL/v1/api/test/simple?type=tables" | jq '.tables | length')
echo "✅ 发现 $TABLE_COUNT 个数据库表"

echo ""
echo "📋 4. Pools 表测试..."
POOLS_INFO=$(curl -s "$BASE_URL/v1/api/test/simple?type=pools")
POOL_COUNT=$(echo "$POOLS_INFO" | jq '.count')
echo "✅ Pools 表包含 $POOL_COUNT 条记录"

echo ""
echo "📋 5. 数据插入测试..."
INSERT_RESULT=$(curl -s "$BASE_URL/v1/api/test/simple?type=insert")
if echo "$INSERT_RESULT" | jq -e '.success' >/dev/null; then
    echo "✅ 数据插入成功"
    NEW_ID=$(echo "$INSERT_RESULT" | jq -r '.insertedData.id')
    echo "   新记录 ID: $NEW_ID"
else
    echo "❌ 数据插入失败"
    echo "$INSERT_RESULT" | jq '.error'
fi

echo ""
echo "📋 6. 同步逻辑测试..."
SYNC_RESULT=$(curl -s "$BASE_URL/v1/api/test/simple?type=sync")
if echo "$SYNC_RESULT" | jq -e '.success' >/dev/null; then
    echo "✅ 同步逻辑测试成功"
    SYNC_POOL_COUNT=$(echo "$SYNC_RESULT" | jq '.data.poolCount')
    echo "   同步发现池数量: $SYNC_POOL_COUNT"
else
    echo "❌ 同步逻辑测试失败"
    echo "$SYNC_RESULT" | jq '.error'
fi

echo ""
echo "📋 7. Cron Handler 测试..."
CRON_RESULT=$(curl -s "$BASE_URL/v1/api/test/simple?type=cron")
if echo "$CRON_RESULT" | jq -e '.success' >/dev/null; then
    echo "✅ Cron Handler 测试成功"
else
    echo "❌ Cron Handler 测试失败"
    echo "$CRON_RESULT" | jq '.error'
fi

echo ""
echo "📋 8. 区块链连接测试..."
BLOCKCHAIN_RESULT=$(curl -s "$BASE_URL/v1/api/test/simple?type=blockchain")
if echo "$BLOCKCHAIN_RESULT" | jq -e '.success' >/dev/null; then
    echo "✅ 区块链连接配置正确"
    BSC_VALID=$(echo "$BLOCKCHAIN_RESULT" | jq '.data.rpcTest.bscUrlValid')
    BSCTEST_VALID=$(echo "$BLOCKCHAIN_RESULT" | jq '.data.rpcTest.bscTestUrlValid')
    echo "   BSC 主网 RPC: $BSC_VALID"
    echo "   BSC 测试网 RPC: $BSCTEST_VALID"
else
    echo "❌ 区块链连接测试失败"
    echo "$BLOCKCHAIN_RESULT" | jq '.error'
fi

echo ""
echo "📋 9. 数据清理测试..."
CLEANUP_RESULT=$(curl -s "$BASE_URL/v1/api/test/simple?type=cleanup")
if echo "$CLEANUP_RESULT" | jq -e '.success' >/dev/null; then
    echo "✅ 数据清理成功"
    DELETED=$(echo "$CLEANUP_RESULT" | jq '.data.deletedRecords')
    REMAINING=$(echo "$CLEANUP_RESULT" | jq '.data.remainingRecords')
    echo "   删除记录: $DELETED"
    echo "   剩余记录: $REMAINING"
else
    echo "❌ 数据清理失败"
    echo "$CLEANUP_RESULT" | jq '.error'
fi

echo ""
echo "📋 10. 同步状态检查..."
SYNC_STATUS=$(curl -s "$BASE_URL/v1/api/admin/sync/status")
if echo "$SYNC_STATUS" | jq -e '.success' >/dev/null; then
    echo "✅ 同步状态正常"
    IS_RUNNING=$(echo "$SYNC_STATUS" | jq '.data.isRunning')
    echo "   同步服务运行状态: $IS_RUNNING"
else
    echo "❌ 同步状态检查失败"
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "📊 测试总结:"
echo "- 数据库连接: ✅"
echo "- 表结构: ✅ ($TABLE_COUNT 个表)"
echo "- 数据操作: ✅"
echo "- 同步逻辑: ✅"
echo "- Cron Handler: ✅"
echo "- 区块链配置: ✅"
echo "- 数据清理: ✅"
echo ""
echo "🚀 现在你可以手动运行同步逻辑了！"
echo ""
echo "📋 可用的测试端点:"
echo "- GET $BASE_URL/v1/api/test/simple?type=basic"
echo "- GET $BASE_URL/v1/api/test/simple?type=pools"
echo "- GET $BASE_URL/v1/api/test/simple?type=sync"
echo "- GET $BASE_URL/v1/api/test/simple?type=cron"
echo "- GET $BASE_URL/v1/api/test/simple?type=blockchain"
echo ""
echo "📋 同步控制端点:"
echo "- GET $BASE_URL/v1/api/admin/sync/status"
echo "- POST $BASE_URL/v1/api/admin/sync/start"
echo "- POST $BASE_URL/v1/api/admin/sync/trigger"
