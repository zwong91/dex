#!/bin/bash

# BSC 测试网 Indexer 查询工具
# 使用方法: ./query.sh [command]

BASE_URL="http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet"
POSTGRES_CMD="docker exec -it postgres psql -U graph-node -d graph-node"

case "$1" in
    "status")
        echo "🔍 检查服务状态..."
        docker-compose ps
        ;;
    
    "factory")
        echo "🏭 查询 LB Factory 信息..."
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"query": "{ lbfactories { id pairCount tokenCount } }"}' \
            $BASE_URL | jq '.'
        ;;
    
    "pairs")
        echo "💱 查询交易对信息..."
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"query": "{ lbpairs { id name tokenX { id symbol name } tokenY { id symbol name } timestamp block } }"}' \
            $BASE_URL | jq '.'
        ;;
    
    "tokens")
        echo "🪙 查询代币信息..."
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"query": "{ tokens(first: 10) { id symbol name decimals totalSupply } }"}' \
            $BASE_URL | jq '.'
        ;;
    
    "bins")
        echo "📊 查询流动性 Bins (前10个有流动性的)..."
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"query": "{ bins(first: 10, where: {totalSupply_gt: \"0\"}, orderBy: binId) { id binId totalSupply reserveX reserveY lbPair { name } } }"}' \
            $BASE_URL | jq '.'
        ;;
    
    "traces")
        echo "📝 查询最新交易记录..."
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"query": "{ traces(first: 10, orderBy: id, orderDirection: desc) { id type lbPair binId amountXIn amountXOut amountYIn amountYOut txHash } }"}' \
            $BASE_URL | jq '.'
        ;;
    
    "sql-stats")
        echo "📈 SQL 统计数据..."
        $POSTGRES_CMD -c "
        SELECT 
            'LBFactory' as entity, COUNT(*) as count FROM sgd1.lb_factory
        UNION ALL
        SELECT 'LBPair' as entity, COUNT(*) as count FROM sgd1.lb_pair
        UNION ALL
        SELECT 'Token' as entity, COUNT(DISTINCT id) as count FROM sgd1.token
        UNION ALL
        SELECT 'Bin' as entity, COUNT(*) as count FROM sgd1.bin
        UNION ALL
        SELECT 'Trace' as entity, COUNT(*) as count FROM sgd1.trace;
        "
        ;;
    
    "playground")
        echo "🎮 打开 GraphQL Playground..."
        echo "访问: http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet/graphql"
        ;;
    
    *)
        echo "🚀 BSC 测试网 Indexer 查询工具"
        echo ""
        echo "可用命令:"
        echo "  status      - 检查服务状态"
        echo "  factory     - 查询工厂信息"
        echo "  pairs       - 查询交易对"
        echo "  tokens      - 查询代币"
        echo "  bins        - 查询流动性 bins"
        echo "  traces      - 查询交易记录"
        echo "  sql-stats   - SQL 统计数据"
        echo "  playground  - GraphQL Playground"
        echo ""
        echo "示例: ./query.sh factory"
        ;;
esac
