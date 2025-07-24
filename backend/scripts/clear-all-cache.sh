#!/bin/bash

# 简单的缓存清理脚本
# 调用 API 端点来清理所有缓存

API_BASE_URL="${API_BASE_URL:-https://api.dex.jongun2038.win}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo "🗑️ 开始清理所有缓存..."
echo "🌐 API 端点: $API_BASE_URL"

# 构建请求头
HEADERS=(-H "Content-Type: application/json")
if [ -n "$AUTH_TOKEN" ]; then
    HEADERS+=(-H "Authorization: Bearer $AUTH_TOKEN")
fi

# 调用清理 API
echo "📡 调用内部清理 API..."
response=$(curl -s "${HEADERS[@]}" \
    -X POST \
    "$API_BASE_URL/v1/api/cache/internal/clear-all")

echo "📋 API 响应:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

# 检查是否成功
if echo "$response" | grep -q '"success".*true'; then
    echo ""
    echo "🎉 缓存清理成功!"
    
    # 提取删除数量
    deleted_count=$(echo "$response" | jq -r '.deletedCount // 0' 2>/dev/null)
    if [ "$deleted_count" != "0" ] && [ "$deleted_count" != "null" ]; then
        echo "📊 删除了 $deleted_count 个缓存条目"
    fi
else
    echo ""
    echo "❌ 缓存清理失败!"
    echo "请检查 API 响应和网络连接"
    exit 1
fi
