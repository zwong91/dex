#!/bin/bash

# 实时监控 Subgraph 同步进度
# 使用方法: ./monitor.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 清屏
clear

echo -e "${BLUE}🔄 Subgraph 同步监控${NC}"
echo -e "${YELLOW}按 Ctrl+C 退出监控${NC}"
echo ""

while true; do
    # 获取同步状态
    SYNC_DATA=$(curl -s http://localhost:8030/graphql \
        -H "Content-Type: application/json" \
        -d '{"query":"{ indexingStatuses { subgraph health synced fatalError { message } chains { network chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$SYNC_DATA" ]; then
        # 解析数据
        HEALTH=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].health // "unknown"' 2>/dev/null)
        SYNCED=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
        CHAIN_HEAD=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].chainHeadBlock.number // "0"' 2>/dev/null)
        LATEST_BLOCK=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].latestBlock.number // "0"' 2>/dev/null)
        NETWORK=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].network // "unknown"' 2>/dev/null)
        ERROR_MSG=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].fatalError.message // null' 2>/dev/null)
        
        # 计算同步进度
        if [ "$CHAIN_HEAD" != "0" ] && [ "$LATEST_BLOCK" != "0" ]; then
            PROGRESS=$(echo "scale=2; ($LATEST_BLOCK * 100) / $CHAIN_HEAD" | bc 2>/dev/null || echo "0")
            REMAINING=$(echo "$CHAIN_HEAD - $LATEST_BLOCK" | bc 2>/dev/null || echo "0")
        else
            PROGRESS="0"
            REMAINING="unknown"
        fi
        
        # 获取当前时间
        CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
        
        # 清除当前行并显示状态
        echo -ne "\r\033[K"
        
        # 显示状态
        case $HEALTH in
            "healthy")
                HEALTH_COLOR=$GREEN
                HEALTH_ICON="✅"
                ;;
            "unhealthy")
                HEALTH_COLOR=$RED
                HEALTH_ICON="❌"
                ;;
            "failed")
                HEALTH_COLOR=$RED
                HEALTH_ICON="💀"
                ;;
            *)
                HEALTH_COLOR=$YELLOW
                HEALTH_ICON="❓"
                ;;
        esac
        
        if [ "$SYNCED" = "true" ]; then
            SYNC_COLOR=$GREEN
            SYNC_ICON="🎉"
            SYNC_STATUS="已完成"
        else
            SYNC_COLOR=$YELLOW
            SYNC_ICON="⏳"
            SYNC_STATUS="同步中"
        fi
        
        # 进度条
        BAR_LENGTH=20
        FILLED_LENGTH=$(echo "($PROGRESS * $BAR_LENGTH) / 100" | bc 2>/dev/null || echo "0")
        FILLED_LENGTH=${FILLED_LENGTH%.*}  # 去掉小数部分
        
        BAR=""
        for ((i=1; i<=BAR_LENGTH; i++)); do
            if [ $i -le $FILLED_LENGTH ]; then
                BAR="${BAR}█"
            else
                BAR="${BAR}░"
            fi
        done
        
        # 显示状态行
        printf "${CYAN}%s${NC} | ${HEALTH_COLOR}%s %s${NC} | ${SYNC_COLOR}%s %s${NC} | ${PURPLE}%s${NC} [${BLUE}%s${NC}] ${YELLOW}%.1f%%${NC} | 剩余: ${RED}%s${NC} 块\n" \
            "$CURRENT_TIME" "$HEALTH_ICON" "$HEALTH" "$SYNC_ICON" "$SYNC_STATUS" "$NETWORK" "$BAR" "$PROGRESS" "$REMAINING"
        
        # 显示详细信息
        printf "    当前块: ${BLUE}%s${NC} | 链头: ${GREEN}%s${NC}" "$LATEST_BLOCK" "$CHAIN_HEAD"
        
        # 如果有错误，显示错误信息
        if [ "$ERROR_MSG" != "null" ] && [ ! -z "$ERROR_MSG" ]; then
            printf " | ${RED}错误: %s${NC}" "$ERROR_MSG"
        fi
        
        echo ""
        
        # 如果同步完成，显示庆祝信息
        if [ "$SYNCED" = "true" ]; then
            echo ""
            echo -e "${GREEN}🎉 同步完成！你现在可以查询数据了！${NC}"
            echo -e "${BLUE}💡 使用以下命令查询数据:${NC}"
            echo -e "  ./query.sh stats    # 查询统计信息"
            echo -e "  ./query.sh pools    # 查询流动性池"
            echo -e "  ./query.sh swaps    # 查询交易记录"
            echo ""
            break
        fi
        
    else
        echo -e "${RED}❌ 无法连接到 Graph Node${NC}"
    fi
    
    # 等待 5 秒
    sleep 5
done
