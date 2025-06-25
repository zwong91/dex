#!/bin/bash

# 服务管理脚本
# 使用方法: ./manage.sh [start|stop|restart|status|logs|clean]

ACTION=${1:-status}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

case $ACTION in
    "start")
        echo -e "${BLUE}🚀 启动所有服务...${NC}"
        npm run start:node
        echo -e "${YELLOW}⏰ 等待服务启动（30秒）...${NC}"
        sleep 30
        docker-compose ps
        ;;
    
    "stop")
        echo -e "${YELLOW}🛑 停止所有服务...${NC}"
        npm run stop:node
        ;;
    
    "restart")
        echo -e "${YELLOW}🔄 重启所有服务...${NC}"
        npm run restart:node
        ;;
    
    "query")
        echo -e "${BLUE}📊 GraphQL 查询示例:${NC}"
        echo ""
        echo -e "${YELLOW}1. 查看所有流动性池:${NC}"
        echo 'curl -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -d '"'"'{"query":"{ lbPairs(first: 5) { id tokenX { symbol } tokenY { symbol } volumeUSD totalValueLockedUSD } }"}'"'"
        echo ""
        echo -e "${YELLOW}2. 查看最新交易:${NC}"
        echo 'curl -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -d '"'"'{"query":"{ swaps(first: 5, orderBy: timestamp, orderDirection: desc) { id amountUSD timestamp lbPair { tokenX { symbol } tokenY { symbol } } } }"}'"'"
        echo ""
        echo -e "${YELLOW}3. 查看统计信息:${NC}"
        echo 'curl -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -d '"'"'{"query":"{ lbFactories { pairCount volumeUSD totalValueLockedUSD txCount } }"}'"'"
        echo ""
        echo -e "${GREEN}💡 提示: 访问 http://localhost:8000/subgraphs/name/entysquare/indexer-bnb/graphql 进行交互式查询${NC}"
        ;;
    
    "test-query")
        echo -e "${BLUE}🧪 执行测试查询...${NC}"
        echo ""
        echo -e "${YELLOW}查询 LBFactory 统计信息:${NC}"
        curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb \
          -H "Content-Type: application/json" \
          -d '{"query":"{ lbFactories { pairCount volumeUSD totalValueLockedUSD txCount tokenCount userCount } }"}' \
          | jq '.data.lbFactories[0]' 2>/dev/null || echo "查询失败或无数据"
        echo ""
        echo -e "${YELLOW}查询流动性池数量:${NC}"
        curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb \
          -H "Content-Type: application/json" \
          -d '{"query":"{ lbPairs { id } }"}' \
          | jq '.data.lbPairs | length' 2>/dev/null || echo "查询失败"
        ;;
    
    "sync-status")
        echo -e "${BLUE}🔄 同步状态详情:${NC}"
        curl -s http://localhost:8030/graphql \
          -H "Content-Type: application/json" \
          -d '{"query":"{ indexingStatuses { subgraph health synced fatalError { message } chains { network chainHeadBlock { number } latestBlock { number } } } }"}' \
          | jq '.data.indexingStatuses[]' 2>/dev/null || echo "无法获取同步状态"
        ;;
    
    "monitor")
        echo -e "${BLUE}🔄 启动实时监控...${NC}"
        ./monitor.sh
        ;;
    
    "quick-status")
        echo -e "${BLUE}📊 快速状态检查:${NC}"
        SYNC_DATA=$(curl -s http://localhost:8030/graphql \
            -H "Content-Type: application/json" \
            -d '{"query":"{ indexingStatuses { health synced chains { chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null)
        
        if [ $? -eq 0 ] && [ ! -z "$SYNC_DATA" ]; then
            HEALTH=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].health // "unknown"' 2>/dev/null)
            SYNCED=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
            CHAIN_HEAD=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].chainHeadBlock.number // "0"' 2>/dev/null)
            LATEST_BLOCK=$(echo $SYNC_DATA | jq -r '.data.indexingStatuses[0].chains[0].latestBlock.number // "0"' 2>/dev/null)
            
            if [ "$CHAIN_HEAD" != "0" ] && [ "$LATEST_BLOCK" != "0" ]; then
                PROGRESS=$(echo "scale=2; ($LATEST_BLOCK * 100) / $CHAIN_HEAD" | bc 2>/dev/null || echo "0")
                REMAINING=$(echo "$CHAIN_HEAD - $LATEST_BLOCK" | bc 2>/dev/null || echo "0")
            else
                PROGRESS="0"
                REMAINING="unknown"
            fi
            
            if [ "$SYNCED" = "true" ]; then
                echo -e "  状态: ${GREEN}✅ 同步完成${NC}"
            else
                echo -e "  状态: ${YELLOW}⏳ 同步中 (${PROGRESS}%)${NC}"
                echo -e "  进度: ${LATEST_BLOCK} / ${CHAIN_HEAD} (剩余 ${REMAINING} 块)"
            fi
            echo -e "  健康: ${HEALTH}"
        else
            echo -e "  ${RED}❌ 无法获取状态${NC}"
        fi
        ;;
    
    "status")
        echo -e "${BLUE}📊 服务状态:${NC}"
        docker-compose ps
        echo ""
        echo -e "${BLUE}🔍 端口使用情况:${NC}"
        lsof -i :8000 2>/dev/null || echo "端口 8000 未被占用"
        lsof -i :8020 2>/dev/null || echo "端口 8020 未被占用"
        lsof -i :5001 2>/dev/null || echo "端口 5001 未被占用"
        echo ""
        echo -e "${BLUE}📊 Subgraph 状态:${NC}"
        curl -s http://localhost:8030/graphql \
          -H "Content-Type: application/json" \
          -d '{"query":"{ indexingStatuses { subgraph health synced fatalError { message } chains { chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null \
          | jq '.data.indexingStatuses[] | {subgraph: .subgraph, health: .health, synced: .synced, chainHead: .chains[0].chainHeadBlock.number, latestBlock: .chains[0].latestBlock.number}' 2>/dev/null \
          || echo "无法获取 subgraph 状态 (请确保 Graph Node 正在运行)"
        echo ""
        echo -e "${GREEN}🌐 GraphQL 端点:${NC}"
        echo "  查询端点: http://localhost:8000/subgraphs/name/entysquare/indexer-bnb"
        echo "  浏览器:   http://localhost:8000/subgraphs/name/entysquare/indexer-bnb/graphql"
        ;;
    
    "logs")
        echo -e "${BLUE}📋 选择要查看的日志:${NC}"
        echo "1) Graph Node"
        echo "2) IPFS"
        echo "3) PostgreSQL"
        echo "4) 所有日志"
        read -p "请选择 (1-4): " choice
        
        case $choice in
            1) npm run logs:graph ;;
            2) npm run logs:ipfs ;;
            3) npm run logs:postgres ;;
            4) docker-compose logs -f ;;
            *) echo "无效选择" ;;
        esac
        ;;
    
    "clean")
        echo -e "${RED}🧹 完全清理环境 (这将删除所有数据!)${NC}"
        read -p "确定要继续吗? (y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            npm run clean
            echo -e "${GREEN}✅ 清理完成${NC}"
        else
            echo "取消清理"
        fi
        ;;
    
    *)
        echo "使用方法: ./manage.sh [start|stop|restart|status|logs|clean|query|test-query|sync-status|monitor|quick-status]"
        echo ""
        echo "  start        - 启动所有服务"
        echo "  stop         - 停止所有服务"
        echo "  restart      - 重启所有服务"
        echo "  status       - 查看服务状态和 subgraph 状态"
        echo "  logs         - 查看日志"
        echo "  clean        - 完全清理环境"
        echo "  query        - 显示 GraphQL 查询示例"
        echo "  test-query   - 执行测试查询"
        echo "  sync-status  - 查看详细同步状态"
        echo "  monitor      - 启动实时同步监控"
        echo "  quick-status - 快速检查同步状态"
        ;;
esac
