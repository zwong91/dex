#!/bin/bash

# 简单的同步进度检查
# 使用方法: ./check-sync.sh

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔄 检查 Subgraph 同步状态...${NC}"

# 获取同步状态
SYNC_DATA=$(curl -s http://localhost:8030/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ indexingStatuses { health synced chains { network chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$SYNC_DATA" ]; then
    HEALTH=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].health // "unknown"' 2>/dev/null)
    SYNCED=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
    CHAIN_HEAD=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].chainHeadBlock.number // "0"' 2>/dev/null)
    LATEST_BLOCK=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].latestBlock.number // "0"' 2>/dev/null)
    NETWORK=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].network // "unknown"' 2>/dev/null)
    
    if [ "$CHAIN_HEAD" != "0" ] && [ "$LATEST_BLOCK" != "0" ]; then
        PROGRESS=$(echo "scale=2; ($LATEST_BLOCK * 100) / $CHAIN_HEAD" | bc 2>/dev/null || echo "0")
        REMAINING=$(echo "$CHAIN_HEAD - $LATEST_BLOCK" | bc 2>/dev/null || echo "0")
        
        # 估算剩余时间（假设每秒处理 10 个块）
        if [ "$REMAINING" != "0" ]; then
            REMAINING_SECONDS=$(echo "$REMAINING / 10" | bc 2>/dev/null || echo "0")
            REMAINING_MINUTES=$(echo "$REMAINING_SECONDS / 60" | bc 2>/dev/null || echo "0")
            REMAINING_HOURS=$(echo "$REMAINING_MINUTES / 60" | bc 2>/dev/null || echo "0")
        fi
    else
        PROGRESS="0"
        REMAINING="unknown"
    fi
    
    echo ""
    echo -e "📊 ${BLUE}网络:${NC} $NETWORK"
    echo -e "💊 ${BLUE}健康状态:${NC} $HEALTH"
    
    if [ "$SYNCED" = "true" ]; then
        echo -e "✅ ${GREEN}状态: 同步完成！${NC}"
        echo ""
        echo -e "${GREEN}🎉 你的 subgraph 已经同步完成，可以开始查询数据了！${NC}"
        echo ""
        echo -e "${BLUE}💡 试试这些命令:${NC}"
        echo -e "  ./query.sh stats    # 查询统计信息"
        echo -e "  ./query.sh pools    # 查询流动性池"
        echo -e "  ./query.sh swaps    # 查询交易记录"
    else
        echo -e "⏳ ${YELLOW}状态: 同步中${NC}"
        echo -e "📈 ${BLUE}进度:${NC} ${PROGRESS}%"
        echo -e "🔢 ${BLUE}当前块:${NC} ${LATEST_BLOCK}"
        echo -e "🎯 ${BLUE}目标块:${NC} ${CHAIN_HEAD}"
        echo -e "📉 ${BLUE}剩余块数:${NC} ${REMAINING}"
        
        if [ "$REMAINING" != "unknown" ] && [ "$REMAINING" != "0" ]; then
            if [ "$REMAINING_HOURS" -gt "0" ]; then
                echo -e "⏰ ${BLUE}预计剩余时间:${NC} 约 ${REMAINING_HOURS} 小时 ${REMAINING_MINUTES} 分钟"
            elif [ "$REMAINING_MINUTES" -gt "0" ]; then
                echo -e "⏰ ${BLUE}预计剩余时间:${NC} 约 ${REMAINING_MINUTES} 分钟"
            else
                echo -e "⏰ ${BLUE}预计剩余时间:${NC} 约 ${REMAINING_SECONDS} 秒"
            fi
        fi
        
        echo ""
        echo -e "${YELLOW}💡 提示:${NC}"
        echo -e "  - 使用 './monitor.sh' 启动实时监控"
        echo -e "  - 使用 './manage.sh logs' 查看同步日志"
        echo -e "  - 同步完成后会自动开始索引数据"
    fi
    
else
    echo -e "${RED}❌ 无法连接到 Graph Node，请检查服务是否运行${NC}"
    echo -e "${BLUE}💡 使用 './manage.sh status' 检查服务状态${NC}"
fi

echo ""
