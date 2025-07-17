#!/bin/bash

# 缓存强制刷新脚本
# 使用 X-Force-Refresh 头来绕过缓存并重新生成

API_BASE_URL="${API_BASE_URL:-https://your-worker.workers.dev}"

echo "🔥 强制刷新所有主要缓存端点..."

# 主要的缓存端点
ENDPOINTS=(
    "/v1/api/dex/health"
    "/v1/api/dex/subgraph-meta"
    "/v1/api/dex/tokens/bsc?limit=100&offset=0"
    "/v1/api/dex/tokens/bsc?limit=50&offset=0"
    "/v1/api/dex/tokens/bsc?limit=20&offset=0"
    "/v1/api/dex/pools/bsc?limit=100&offset=0&orderBy=totalValueLockedUSD&orderDirection=desc"
    "/v1/api/dex/pools/bsc?limit=50&offset=0&orderBy=totalValueLockedUSD&orderDirection=desc"
    "/v1/api/dex/pools/bsc?limit=20&offset=0&orderBy=totalValueLockedUSD&orderDirection=desc"
    "/v1/api/dex/pools/bsc?limit=100&offset=0&orderBy=volumeUSD&orderDirection=desc"
    "/v1/api/dex/pools/bsc?limit=50&offset=0&orderBy=volumeUSD&orderDirection=desc"
)

# 计数器
SUCCESS_COUNT=0
FAILED_COUNT=0

echo "📡 开始强制刷新 ${#ENDPOINTS[@]} 个端点..."
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
    echo "🔄 正在刷新: $endpoint"
    
    response=$(curl -s -w "%{http_code}" \
        -H "X-Force-Refresh: true" \
        -H "Content-Type: application/json" \
        "$API_BASE_URL$endpoint" \
        -o /dev/null)
    
    if [ "$response" -eq 200 ]; then
        echo "   ✅ 成功 (HTTP $response)"
        ((SUCCESS_COUNT++))
    else
        echo "   ❌ 失败 (HTTP $response)"
        ((FAILED_COUNT++))
    fi
    
    # 小延迟避免过载
    sleep 0.5
done

echo ""
echo "📊 刷新结果:"
echo "   ✅ 成功: $SUCCESS_COUNT"
echo "   ❌ 失败: $FAILED_COUNT"
echo "   📈 总计: ${#ENDPOINTS[@]}"

if [ $FAILED_COUNT -eq 0 ]; then
    echo ""
    echo "🎉 所有缓存已成功强制刷新!"
else
    echo ""
    echo "⚠️  部分端点刷新失败，请检查日志"
    exit 1
fi
