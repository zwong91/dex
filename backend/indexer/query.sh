#!/bin/bash

# GraphQL 查询工具
# 使用方法: ./query.sh [pools|swaps|stats|custom]

QUERY_TYPE=${1:-help}
ENDPOINT="http://localhost:8000/subgraphs/name/entysquare/indexer-bnb"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

case $QUERY_TYPE in
    "pools")
        echo -e "${BLUE}🏊 查询流动性池...${NC}"
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d '{"query":"{ lbpairs(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) { id tokenX { symbol name decimals } tokenY { symbol name decimals } volumeUSD totalValueLockedUSD feesUSD txCount } }"}' \
          | jq '.data.lbpairs[] | {pair: (.tokenX.symbol + "/" + .tokenY.symbol), tvl: .totalValueLockedUSD, volume: .volumeUSD, fees: .feesUSD, txs: .txCount}'
        ;;
    
    "swaps")
        echo -e "${BLUE}💱 查询最新交易...${NC}"
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d '{"query":"{ swaps(first: 10, orderBy: timestamp, orderDirection: desc) { id timestamp amountUSD amountXIn amountYIn amountXOut amountYOut lbpair { tokenX { symbol } tokenY { symbol } } user { id } } }"}' \
          | jq '.data.swaps[] | {pair: (.lbpair.tokenX.symbol + "/" + .lbpair.tokenY.symbol), amountUSD: .amountUSD, user: .user.id[0:8], time: (.timestamp | tonumber | strftime("%Y-%m-%d %H:%M:%S"))}'
        ;;
    
    "stats")
        echo -e "${BLUE}📊 查询统计信息...${NC}"
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d '{"query":"{ lbfactories { pairCount volumeUSD totalValueLockedUSD txCount tokenCount userCount feesUSD } }"}' \
          | jq '.data.lbfactories[0]'
        ;;
    
    "tokens")
        echo -e "${BLUE}🪙 查询代币信息...${NC}"
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d '{"query":"{ tokens(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) { id symbol name decimals totalValueLockedUSD volumeUSD txCount } }"}' \
          | jq '.data.tokens[] | {symbol: .symbol, name: .name, tvl: .totalValueLockedUSD, volume: .volumeUSD, txs: .txCount}'
        ;;
    
    "users")
        echo -e "${BLUE}👥 查询活跃用户...${NC}"
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d '{"query":"{ users(first: 10, orderBy: txCount, orderDirection: desc) { id txCount } }"}' \
          | jq '.data.users[] | {user: .id[0:10], transactions: .txCount}'
        ;;
    
    "positions")
        echo -e "${BLUE}💰 查询流动性头寸...${NC}"
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d '{"query":"{ liquidityPositions(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) { id user { id } lbPair { tokenX { symbol } tokenY { symbol } } binsCount totalValueLockedUSD } }"}' \
          | jq '.data.liquidityPositions[] | {user: .user.id[0:8], pair: (.lbPair.tokenX.symbol + "/" + .lbPair.tokenY.symbol), bins: .binsCount, tvl: .totalValueLockedUSD}'
        ;;
    
    "sync")
        echo -e "${BLUE}🔄 查询同步状态...${NC}"
        curl -s http://localhost:8030/graphql \
          -H "Content-Type: application/json" \
          -d '{"query":"{ indexingStatuses { subgraph health synced fatalError { message } chains { network chainHeadBlock { number } latestBlock { number } } } }"}' \
          | jq '.data.indexingStatuses[]'
        ;;
    
    "custom")
        echo -e "${YELLOW}📝 自定义查询 (输入 GraphQL 查询语句):${NC}"
        echo "示例: { lbPairs { id } }"
        echo -n "查询: "
        read query
        curl -s -X POST $ENDPOINT \
          -H "Content-Type: application/json" \
          -d "{\"query\":\"$query\"}" \
          | jq '.'
        ;;
    
    "help"|*)
        echo -e "${GREEN}🔍 GraphQL 查询工具${NC}"
        echo ""
        echo "使用方法: ./query.sh [命令]"
        echo ""
        echo "可用命令:"
        echo "  pools      - 查询流动性池 (按 TVL 排序)"
        echo "  swaps      - 查询最新交易"
        echo "  stats      - 查询总体统计信息"
        echo "  tokens     - 查询代币信息"
        echo "  users      - 查询活跃用户"
        echo "  positions  - 查询流动性头寸"
        echo "  sync       - 查询同步状态"
        echo "  custom     - 自定义查询"
        echo ""
        echo -e "${BLUE}💡 提示:${NC}"
        echo "  - 访问 http://localhost:8000/subgraphs/name/entysquare/indexer-bnb/graphql 进行交互式查询"
        echo "  - 使用 jq 工具可以更好地格式化 JSON 输出"
        ;;
esac
