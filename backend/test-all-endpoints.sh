#!/bin/bash

# EntYSquare DEX API - 24个接口测试脚本
# 测试所有已实现的 API 接口

API_BASE="http://localhost:8787"
API_KEY="admin-key"  # 使用管理员 API 密钥来测试所有功能

echo "🚀 开始测试 EntYSquare DEX API 的 24 个接口..."
echo "========================================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=${4:-200}
    
    echo -n "Testing $method $endpoint - $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -H "X-API-Key: $API_KEY" "$API_BASE$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" -d '{}' "$API_BASE$endpoint")
    fi
    
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $status_code${NC}"
    elif [ "$status_code" = "403" ]; then
        echo -e "${YELLOW}⚠️  $status_code (权限不足)${NC}"
    else
        echo -e "${RED}❌ $status_code${NC}"
    fi
}

echo ""
echo "📊 1. DEX Analytics 接口 (1个)"
echo "----------------------------------------"
test_endpoint "GET" "/v1/api/dex/analytics/bsc?startTime=1672531200" "DEX分析数据"

echo ""
echo "🏊 2. Pools 接口 (3个)"
echo "----------------------------------------"
test_endpoint "GET" "/v1/api/dex/pools" "基础池列表"
test_endpoint "GET" "/v1/api/dex/pools/bsc?pageSize=5" "按链获取池列表"
test_endpoint "GET" "/v1/api/dex/pools/bsc/0x1234567890123456789012345678901234567890" "池详情"

echo ""
echo "🎁 3. Rewards 接口 (4个)"
echo "----------------------------------------"
test_endpoint "GET" "/v1/api/dex/rewards/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89" "用户奖励证明"
test_endpoint "POST" "/v1/api/dex/rewards/batch-proof/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89" "批量奖励证明"
test_endpoint "GET" "/v1/api/dex/rewards/claimable/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89" "可领取奖励"
test_endpoint "GET" "/v1/api/dex/rewards/history/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89" "奖励历史"

echo ""
echo "👤 4. User 接口 (7个)"
echo "----------------------------------------"
test_endpoint "GET" "/v1/api/dex/user/bin-ids/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" "用户Bin IDs"
test_endpoint "GET" "/v1/api/dex/user/pool-ids/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/bsc" "用户池IDs"
test_endpoint "GET" "/v1/api/dex/user/pool-user-balances?chain=bsc&poolAddress=0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" "池用户余额"
test_endpoint "GET" "/v1/api/dex/user/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/farms" "用户农场仓位"
test_endpoint "GET" "/v1/api/dex/user/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/farms/vault1" "用户指定农场仓位"
test_endpoint "GET" "/v1/api/dex/user/bsc/history/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" "用户历史记录"
test_endpoint "GET" "/v1/api/dex/user/fees-earned/bsc/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" "用户费用收益"

echo ""
echo "📈 5. User Lifetime Stats 接口 (1个)"
echo "----------------------------------------"
test_endpoint "GET" "/v1/api/dex/user-lifetime-stats/bsc/users/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89/swap-stats" "用户交易统计"

echo ""
echo "🏛️ 6. Vaults 接口 (8个)"
echo "----------------------------------------"
test_endpoint "GET" "/v1/api/dex/vaults" "所有资金库"
test_endpoint "GET" "/v1/api/dex/vaults/bsc" "按链获取资金库"
test_endpoint "GET" "/v1/api/dex/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/share-price" "资金库份额价格"
test_endpoint "GET" "/v1/api/dex/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" "资金库详情"
test_endpoint "GET" "/v1/api/dex/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/tvl-history?startTime=1672531200" "资金库TVL历史"
test_endpoint "GET" "/v1/api/dex/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/recent-activity" "资金库最近活动"
test_endpoint "GET" "/v1/api/dex/vaults/bsc/withdrawals/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89" "用户提取记录"
test_endpoint "GET" "/v1/api/dex/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/withdrawals/0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89" "用户指定资金库提取记录"

echo ""
echo "========================================================"
echo "🎉 测试完成！"
echo ""
echo "📊 测试总结："
echo "- 总接口数：24 个"
echo "- ✅ 绿色：接口正常工作"
echo "- ⚠️  黄色：权限不足 (需要配置相应权限)"
echo "- ❌ 红色：接口错误"
echo ""
echo "💡 使用说明："
echo "1. 确保 DEX API 服务已启动 (npm run dev)"
echo "2. 确保数据库中有测试 API 密钥和相应权限"
echo "3. 黄色警告表示权限配置问题，不是接口实现问题"
echo ""
echo "🔧 下一步："
echo "- 为测试用户添加所有必要权限"
echo "- 实现各个接口的具体业务逻辑"
echo "- 完善数据库表结构和数据"
