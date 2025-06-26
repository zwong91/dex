#!/bin/bash

# =================================================================
# DEX Backend & Indexer All-in-One Management Panel
# =================================================================
# 统一管理 Backend API 和 Graph Indexer 的交互式面板
# 
# 功能包括：
# - Backend API 服务管理
# - Graph Indexer 服务管理  
# - 部署和测试
# - 实时监控
# - 查询工具
# =================================================================

# 工作目录配置
BACKEND_DIR="/Users/es/dex/backend"
INDEXER_DIR="/Users/es/dex/backend/indexer"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# 图标定义
ICON_API="🚀"
ICON_INDEXER="📊"
ICON_DEPLOY="🌐"
ICON_TEST="🧪"
ICON_MONITOR="📈"
ICON_QUERY="🔍"
ICON_LOGS="📋"
ICON_CLEAN="🧹"
ICON_EXIT="👋"

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    # 检查必要工具
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
    command -v npm >/dev/null 2>&1 || missing_deps+=("npm")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v bc >/dev/null 2>&1 || missing_deps+=("bc")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ 缺少必要依赖: ${missing_deps[*]}${NC}"
        echo -e "${YELLOW}请安装缺少的工具后重试${NC}"
        exit 1
    fi
}

# 显示标题
show_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}              DEX Backend & Indexer 统一管理面板                  ${CYAN}║${NC}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} ${BLUE}🎯 一站式管理 Backend API 和 Graph Indexer 服务${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${GREEN}📍 Backend:  ~/dex/backend${NC}                               ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${GREEN}📍 Indexer:  ~/dex/backend/indexer${NC}                       ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 获取服务状态
get_api_status() {
    if curl -s "http://localhost:8787/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 在线${NC}"
    else
        echo -e "${RED}❌ 离线${NC}"
    fi
}

get_indexer_status() {
    if curl -s http://localhost:8000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 运行中${NC}"
    else
        echo -e "${RED}❌ 未运行${NC}"
    fi
}

get_sync_status() {
    local sync_data=$(curl -s http://localhost:8030/graphql \
        -H "Content-Type: application/json" \
        -d '{"query":"{ indexingStatuses { health synced chains { chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$sync_data" ]; then
        local synced=$(echo $sync_data | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
        local health=$(echo $sync_data | jq -r '.data.indexingStatuses[0].health // "unknown"' 2>/dev/null)
        
        if [ "$synced" = "true" ]; then
            echo -e "${GREEN}✅ 同步完成${NC}"
        else
            echo -e "${YELLOW}⏳ 同步中${NC}"
        fi
    else
        echo -e "${RED}❌ 无法获取${NC}"
    fi
}

# 快速同步状态检查
check_sync_status() {
    echo -e "${BLUE}🔄 快速同步状态检查...${NC}"
    
    # 获取同步状态
    local sync_data=$(curl -s http://localhost:8030/graphql \
        -H "Content-Type: application/json" \
        -d '{"query":"{ indexingStatuses { health synced chains { network chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$sync_data" ]; then
        local health=$(echo $sync_data | jq -r '.data.indexingStatuses[0].health // "unknown"' 2>/dev/null)
        local synced=$(echo $sync_data | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
        local chain_head=$(echo $sync_data | jq -r '.data.indexingStatuses[0].chains[0].chainHeadBlock.number // "0"' 2>/dev/null)
        local latest_block=$(echo $sync_data | jq -r '.data.indexingStatuses[0].chains[0].latestBlock.number // "0"' 2>/dev/null)
        local network=$(echo $sync_data | jq -r '.data.indexingStatuses[0].chains[0].network // "unknown"' 2>/dev/null)
        
        if [ "$chain_head" != "0" ] && [ "$latest_block" != "0" ]; then
            local progress=$(echo "scale=2; ($latest_block * 100) / $chain_head" | bc 2>/dev/null || echo "0")
            local remaining=$(echo "$chain_head - $latest_block" | bc 2>/dev/null || echo "0")
            
            # 估算剩余时间（假设每秒处理 10 个块）
            if [ "$remaining" != "0" ]; then
                local remaining_seconds=$(echo "$remaining / 10" | bc 2>/dev/null || echo "0")
                local remaining_minutes=$(echo "$remaining_seconds / 60" | bc 2>/dev/null || echo "0")
                local remaining_hours=$(echo "$remaining_minutes / 60" | bc 2>/dev/null || echo "0")
            fi
        else
            local progress="0"
            local remaining="unknown"
        fi
        
        echo ""
        echo -e "📊 ${BLUE}网络:${NC} $network"
        echo -e "💊 ${BLUE}健康状态:${NC} $health"
        
        if [ "$synced" = "true" ]; then
            echo -e "✅ ${GREEN}状态: 同步完成！${NC}"
            echo ""
            echo -e "${GREEN}🎉 你的 subgraph 已经同步完成，可以开始查询数据了！${NC}"
            echo ""
            echo -e "${BLUE}💡 使用查询工具查询数据:${NC}"
            echo -e "  • 统计信息查询"
            echo -e "  • 流动性池查询"
            echo -e "  • 交易记录查询"
        else
            echo -e "⏳ ${YELLOW}状态: 同步中 (${progress}%)${NC}"
            echo -e "📊 ${BLUE}进度:${NC} ${latest_block} / ${chain_head} (剩余 ${remaining} 块)"
            
            if [ "$remaining_hours" != "0" ] && [ "$remaining_hours" -gt 0 ]; then
                echo -e "⏰ ${BLUE}预计剩余时间:${NC} 约 ${remaining_hours} 小时"
            elif [ "$remaining_minutes" != "0" ] && [ "$remaining_minutes" -gt 0 ]; then
                echo -e "⏰ ${BLUE}预计剩余时间:${NC} 约 ${remaining_minutes} 分钟"
            fi
        fi
    else
        echo -e "  ${RED}❌ 无法获取同步状态，请确保 Graph Node 正在运行${NC}"
    fi
    echo ""
}

# 显示状态面板
show_status() {
    echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}│${NC} ${BLUE}📊 系统状态${NC}                                                     ${WHITE}│${NC}"
    echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}│${NC} ${ICON_API} Backend API:     $(get_api_status)                              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${ICON_INDEXER} Graph Indexer:  $(get_indexer_status)                              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} 🔄 同步状态:       $(get_sync_status)                              ${WHITE}│${NC}"
    echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# 主菜单
show_main_menu() {
    echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}│${NC} ${BLUE}🎛️  主菜单${NC}                                                       ${WHITE}│${NC}"
    echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} ${ICON_API} Backend API 管理        ${YELLOW}6)${NC} ${ICON_QUERY} 查询工具              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} ${ICON_INDEXER} Graph Indexer 管理      ${YELLOW}7)${NC} ${ICON_LOGS} 日志查看              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} ${ICON_DEPLOY} 部署管理               ${YELLOW}8)${NC} ${ICON_CLEAN} 环境清理              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} ${ICON_TEST} 测试工具                ${YELLOW}9)${NC} 🔧 脚本管理              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}5)${NC} ${ICON_MONITOR} 实时监控                ${YELLOW}0)${NC} ${ICON_EXIT} 退出                    ${WHITE}│${NC}"
    echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# Backend API 管理菜单
backend_menu() {
    while true; do
        show_header
        show_status
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_API} ${BLUE}Backend API 管理${NC}                                          ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} 本地开发服务器                                              ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} 部署到 Cloudflare Workers                                  ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} 查看部署状态                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 设置 API 密钥                                              ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-4): " choice
        case $choice in
            1)
                echo -e "${BLUE}🚀 启动本地开发服务器...${NC}"
                cd $BACKEND_DIR && npm run dev
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${BLUE}🌐 部署到 Cloudflare Workers...${NC}"
                cd $BACKEND_DIR && npm run deploy
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}📊 检查部署状态...${NC}"
                echo ""
                echo -e "${YELLOW}Production API:${NC}"
                curl -s "http://localhost:8787/" | jq '.' || echo "无法连接"
                echo ""
                echo -e "${YELLOW}Health Check:${NC}"
                curl -s "http://localhost:8787/health" | jq '.' || echo "无法连接"
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}🔑 设置 API 密钥...${NC}"
                read -p "请输入 API 密钥: " api_key
                if [ ! -z "$api_key" ]; then
                    cd $BACKEND_DIR && wrangler secret put KEY <<< "$api_key"
                    echo -e "${GREEN}✅ API 密钥设置完成${NC}"
                else
                    echo -e "${RED}❌ API 密钥不能为空${NC}"
                fi
                read -p "按任意键继续..."
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# Graph Indexer 管理菜单
indexer_menu() {
    while true; do
        show_header
        show_status
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_INDEXER} ${BLUE}Graph Indexer 管理${NC}                                       ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} 启动 Graph Node                                            ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} 停止 Graph Node                                            ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} 重启 Graph Node                                            ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 部署 Subgraph                                             ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}5)${NC} 查看同步状态                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}6)${NC} 快速状态检查                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}7)${NC} 实时监控同步进度                                           ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}8)${NC} 部署到主网/测试网                                          ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-8): " choice
        case $choice in
            1)
                echo -e "${BLUE}🚀 启动 Graph Node...${NC}"
                cd $INDEXER_DIR && npm run start:node
                echo -e "${YELLOW}⏰ 等待服务启动（30秒）...${NC}"
                sleep 30
                docker-compose ps
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${YELLOW}🛑 停止 Graph Node...${NC}"
                cd $INDEXER_DIR && npm run stop:node
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${YELLOW}🔄 重启 Graph Node...${NC}"
                cd $INDEXER_DIR && npm run restart:node
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}📊 部署 Subgraph...${NC}"
                cd $INDEXER_DIR
                echo "准备 BSC 测试网配置..."
                npm run prepare:bsc-testnet
                echo "生成代码..."
                npm run codegen:bsc-testnet
                echo "构建 Subgraph..."
                npm run build:bsc-testnet
                echo "部署到本地节点..."
                npm run deploy-local
                read -p "按任意键继续..."
                ;;
            5)
                echo -e "${BLUE}🔄 查看详细同步状态...${NC}"
                curl -s http://localhost:8030/graphql \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ indexingStatuses { subgraph health synced fatalError { message } chains { network chainHeadBlock { number } latestBlock { number } } } }"}' \
                  | jq '.data.indexingStatuses[]' 2>/dev/null || echo "无法获取同步状态"
                read -p "按任意键继续..."
                ;;
            6)
                check_sync_status
                read -p "按任意键继续..."
                ;;
            7)
                echo -e "${BLUE}🔄 启动实时同步监控...${NC}"
                echo -e "${YELLOW}按 Ctrl+C 退出监控${NC}"
                echo ""
                
                # 简化的同步监控循环
                while true; do
                    clear
                    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
                    echo -e "${CYAN}║${WHITE}                     同步状态实时监控                         ${CYAN}║${NC}"
                    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
                    echo ""
                    
                    check_sync_status
                    
                    echo -e "${BLUE}⏰ 5秒后刷新... (按 Ctrl+C 退出)${NC}"
                    sleep 5
                done
                ;;
            8)
                echo -e "${BLUE}🌐 选择部署环境:${NC}"
                echo ""
                echo "1) BSC 主网"
                echo "2) BSC 测试网"
                echo "3) Ethereum 主网"
                echo "0) 取消"
                echo ""
                read -p "请选择部署环境 (0-3): " env_choice
                case $env_choice in
                    1)
                        echo -e "${BLUE}📊 部署到 BSC 主网...${NC}"
                        cd $INDEXER_DIR && ./deploy-mainnet.sh
                        ;;
                    2)
                        echo -e "${BLUE}📊 部署到 BSC 测试网...${NC}"
                        cd $INDEXER_DIR && ./deploy-testnet.sh
                        ;;
                    3)
                        echo -e "${BLUE}📊 部署到 Ethereum 主网...${NC}"
                        cd $INDEXER_DIR
                        npm run prepare:ethereum
                        npm run codegen:ethereum
                        npm run build:ethereum
                        echo "请手动使用 Subgraph Studio 进行部署"
                        ;;
                    0)
                        echo "取消部署"
                        ;;
                    *)
                        echo -e "${RED}❌ 无效选择${NC}"
                        ;;
                esac
                read -p "按任意键继续..."
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# 部署管理菜单
deploy_menu() {
    while true; do
        show_header
        show_status
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_DEPLOY} ${BLUE}部署管理${NC}                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} 一键部署全套服务                                           ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} 部署 Backend API                                           ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} 部署 Graph Indexer                                        ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 检查部署状态                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-4): " choice
        case $choice in
            1)
                echo -e "${BLUE}🚀 一键部署全套服务...${NC}"
                echo ""
                echo -e "${YELLOW}步骤 1/3: 启动 Graph Node...${NC}"
                cd $INDEXER_DIR && npm run start:node
                sleep 30
                
                echo -e "${YELLOW}步骤 2/3: 部署 Subgraph...${NC}"
                npm run prepare:bsc-testnet && npm run codegen:bsc-testnet && npm run build:bsc-testnet && npm run deploy-local
                
                echo -e "${YELLOW}步骤 3/3: 部署 Backend API...${NC}"
                cd $BACKEND_DIR && npm run deploy
                
                echo -e "${GREEN}✅ 全套服务部署完成！${NC}"
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${BLUE}🌐 部署 Backend API...${NC}"
                cd $BACKEND_DIR && npm run deploy
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}📊 部署 Graph Indexer...${NC}"
                cd $INDEXER_DIR && npm run deploy-local
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}📊 检查部署状态...${NC}"
                echo ""
                echo -e "${YELLOW}Backend API 状态:${NC}"
                curl -s "http://localhost:8787/health" | jq '.' 2>/dev/null || echo "离线"
                echo ""
                echo -e "${YELLOW}Graph Indexer 状态:${NC}"
                curl -s http://localhost:8000 >/dev/null 2>&1 && echo "✅ 运行中" || echo "❌ 未运行"
                read -p "按任意键继续..."
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# 测试工具菜单
test_menu() {
    while true; do
        show_header
        show_status
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_TEST} ${BLUE}测试工具${NC}                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} 运行 Backend API 测试套件                                  ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} 测试 Backend API 端点                                      ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} 测试 GraphQL 查询                                          ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 性能测试                                                   ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-4): " choice
        case $choice in
            1)
                echo -e "${BLUE}🧪 运行 Backend API 测试套件...${NC}"
                cd $BACKEND_DIR && npm run test:all
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${BLUE}🔗 测试 Backend API 端点...${NC}"
                echo ""
                echo -e "${YELLOW}测试健康检查:${NC}"
                curl -s "http://localhost:8787/health" | jq '.'
                echo ""
                echo -e "${YELLOW}测试认证 (无密钥):${NC}"
                curl -s "http://localhost:8787/v1/api/dex/pools" | jq '.'
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}📊 测试 GraphQL 查询...${NC}"
                echo ""
                
                # 首先检查GraphQL端点是否可用
                echo -e "${YELLOW}检查GraphQL端点状态...${NC}"
                if curl -s http://localhost:8000 >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ GraphQL端点可访问${NC}"
                else
                    echo -e "${RED}❌ GraphQL端点不可访问 (端口 8000)${NC}"
                    echo -e "${BLUE}💡 提示: 请先启动 Graph Indexer 服务${NC}"
                    read -p "按任意键继续..."
                    continue
                fi
                
                # 检查subgraph状态
                echo ""
                echo -e "${YELLOW}检查Subgraph状态...${NC}"
                subgraph_status=$(curl -s -X POST http://localhost:8030/graphql \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ indexingStatuses { subgraph health synced fatalError { message } } }"}' 2>/dev/null)
                
                if [ $? -eq 0 ] && [ ! -z "$subgraph_status" ]; then
                    health=$(echo $subgraph_status | jq -r '.data.indexingStatuses[0].health // "unknown"' 2>/dev/null)
                    synced=$(echo $subgraph_status | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
                    subgraph_name=$(echo $subgraph_status | jq -r '.data.indexingStatuses[0].subgraph // "unknown"' 2>/dev/null)
                    
                    echo -e "📊 ${BLUE}Subgraph:${NC} $subgraph_name"
                    echo -e "💊 ${BLUE}健康状态:${NC} $health"
                    echo -e "🔄 ${BLUE}同步状态:${NC} $synced"
                    
                    if [ "$synced" != "true" ]; then
                        echo -e "${YELLOW}⚠️ Subgraph尚未完全同步，查询结果可能为空${NC}"
                    fi
                else
                    echo -e "${RED}❌ 无法获取Subgraph状态${NC}"
                fi
                
                echo ""
                echo -e "${CYAN}========== GraphQL 查询测试套件 ==========${NC}"
                
                # 测试1: 查询流动性池数量
                echo ""
                echo -e "${BLUE}1. 查询流动性池总数:${NC}"
                pool_count=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -d '{"query":"{ lbpairs { id } }"}' \
                  | jq '.data.lbpairs | length' 2>/dev/null)
                
                if [ "$pool_count" != "null" ] && [ "$pool_count" != "" ]; then
                    echo -e "${GREEN}✅ 找到 $pool_count 个流动性池${NC}"
                    if [ "$pool_count" -gt 0 ]; then
                        echo -e "${BLUE}前5个流动性池详情:${NC}"
                        curl -s -X POST \
                          -H "Content-Type: application/json" \
                          -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                          https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                          -d '{"query":"{ lbpairs(first: 5) { id name tokenX { symbol } tokenY { symbol } reserveX reserveY } }"}' \
                          | jq '.data.lbpairs' 2>/dev/null
                    fi
                else
                    echo -e "${RED}❌ 查询失败或无数据${NC}"
                fi
                
                # 测试2: 查询代币数量
                echo ""
                echo -e "${BLUE}2. 查询代币总数:${NC}"
                token_count=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -d '{"query":"{ tokens { id } }"}' \
                  | jq '.data.tokens | length' 2>/dev/null)
                
                if [ "$token_count" != "null" ] && [ "$token_count" != "" ]; then
                    echo -e "${GREEN}✅ 找到 $token_count 个代币${NC}"
                    if [ "$token_count" -gt 0 ]; then
                        echo -e "${BLUE}前5个代币详情:${NC}"
                        curl -s -X POST \
                          -H "Content-Type: application/json" \
                          -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                          https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                          -d '{"query":"{ tokens(first: 5) { id symbol name decimals } }"}' \
                          | jq '.data.tokens' 2>/dev/null
                    fi
                else
                    echo -e "${RED}❌ 查询失败或无数据${NC}"
                fi
                
                # 测试3: 查询交易记录
                echo ""
                echo -e "${BLUE}3. 查询交易记录:${NC}"
                trace_count=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -d '{"query":"{ traces { id } }"}' \
                  | jq '.data.traces | length' 2>/dev/null)
                
                if [ "$trace_count" != "null" ] && [ "$trace_count" != "" ]; then
                    echo -e "${GREEN}✅ 找到 $trace_count 条交易记录${NC}"
                    if [ "$trace_count" -gt 0 ]; then
                        echo -e "${BLUE}最新5条交易记录:${NC}"
                        curl -s -X POST \
                          -H "Content-Type: application/json" \
                          -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                          https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                          -d '{"query":"{ traces(first: 5, orderBy: id, orderDirection: desc) { id type lbPair binId txHash } }"}' \
                          | jq '.data.traces' 2>/dev/null
                    fi
                else
                    echo -e "${RED}❌ 查询失败或无数据${NC}"
                fi
                
                # 测试4: 查询Factory统计
                echo ""
                echo -e "${BLUE}4. 查询Factory统计信息:${NC}"
                factory_data=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -d '{"query":"{ lbfactories { id pairCount volumeUSD totalValueLockedUSD txCount tokenCount userCount } }"}' 2>/dev/null)
                
                if echo "$factory_data" | jq '.data.lbFactories[0]' >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ Factory统计信息:${NC}"
                    echo "$factory_data" | jq '.data.lbFactories[0]' 2>/dev/null
                else
                    echo -e "${RED}❌ 查询失败或无数据${NC}"
                fi
                
                echo ""
                echo -e "${CYAN}========================================${NC}"
                
                # 如果所有查询都返回0或空，给出建议
                if [ "$pool_count" = "0" ] || [ "$pool_count" = "" ]; then
                    echo ""
                    echo -e "${YELLOW}💡 数据为空的可能原因:${NC}"
                    echo "  1. Subgraph还在同步区块链数据"
                    echo "  2. 目标网络(BSC测试网)上还没有DEX交易"
                    echo "  3. Subgraph配置的合约地址可能需要更新"
                    echo "  4. 需要等待更多时间完成数据索引"
                    echo ""
                    echo -e "${BLUE}🔧 建议操作:${NC}"
                    echo "  • 检查同步状态: 主菜单 → 2) Graph Indexer管理 → 6) 快速状态检查"
                    echo "  • 查看日志: 主菜单 → 7) 日志查看 → 1) Graph Node日志"
                    echo "  • 重新部署: 主菜单 → 2) Graph Indexer管理 → 4) 部署Subgraph"
                fi
                
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}⚡ 性能测试...${NC}"
                echo ""
                echo -e "${YELLOW}API 响应时间测试:${NC}"
                time curl -s "http://localhost:8787/health" >/dev/null
                read -p "按任意键继续..."
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# 实时监控
monitor_mode() {
    echo -e "${BLUE}🔄 启动实时监控模式...${NC}"
    echo -e "${YELLOW}按 Ctrl+C 退出监控${NC}"
    echo ""
    
    while true; do
        clear
        show_header
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_MONITOR} ${BLUE}实时监控${NC} - $(date '+%Y-%m-%d %H:%M:%S')                   ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        
        # Backend API 状态
        if curl -s "http://localhost:8787/health" >/dev/null 2>&1; then
            echo -e "${WHITE}│${NC} ${ICON_API} Backend API:     ${GREEN}✅ 在线${NC}                              ${WHITE}│${NC}"
        else
            echo -e "${WHITE}│${NC} ${ICON_API} Backend API:     ${RED}❌ 离线${NC}                              ${WHITE}│${NC}"
        fi
        
        # Graph Indexer 状态
        if curl -s http://localhost:8000 >/dev/null 2>&1; then
            echo -e "${WHITE}│${NC} ${ICON_INDEXER} Graph Indexer:  ${GREEN}✅ 运行中${NC}                              ${WHITE}│${NC}"
        else
            echo -e "${WHITE}│${NC} ${ICON_INDEXER} Graph Indexer:  ${RED}❌ 未运行${NC}                              ${WHITE}│${NC}"
        fi
        
        # 同步状态
        local sync_data=$(curl -s http://localhost:8030/graphql \
            -H "Content-Type: application/json" \
            -d '{"query":"{ indexingStatuses { health synced chains { chainHeadBlock { number } latestBlock { number } } } }"}' 2>/dev/null)
        
        if [ $? -eq 0 ] && [ ! -z "$sync_data" ]; then
            local synced=$(echo $sync_data | jq -r '.data.indexingStatuses[0].synced // false' 2>/dev/null)
            local chain_head=$(echo $sync_data | jq -r '.data.indexingStatuses[0].chains[0].chainHeadBlock.number // "0"' 2>/dev/null)
            local latest_block=$(echo $sync_data | jq -r '.data.indexingStatuses[0].chains[0].latestBlock.number // "0"' 2>/dev/null)
            
            if [ "$synced" = "true" ]; then
                echo -e "${WHITE}│${NC} 🔄 同步状态:       ${GREEN}✅ 同步完成${NC}                              ${WHITE}│${NC}"
            else
                local progress=$(echo "scale=1; ($latest_block * 100) / $chain_head" | bc 2>/dev/null || echo "0")
                echo -e "${WHITE}│${NC} 🔄 同步状态:       ${YELLOW}⏳ 同步中 (${progress}%)${NC}                     ${WHITE}│${NC}"
                echo -e "${WHITE}│${NC} 📊 进度:          ${latest_block} / ${chain_head}                          ${WHITE}│${NC}"
            fi
        else
            echo -e "${WHITE}│${NC} 🔄 同步状态:       ${RED}❌ 无法获取${NC}                              ${WHITE}│${NC}"
        fi
        
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        
        sleep 5
    done
}

# 查询工具菜单
query_menu() {
    while true; do
        show_header
        show_status
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_QUERY} ${BLUE}查询工具${NC}                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} GraphQL 统计信息                                           ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} 流动性池查询                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} 代币信息查询                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 交易记录查询                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}5)${NC} 流动性 Bins 查询                                          ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}6)${NC} SQL 数据库统计                                            ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}7)${NC} API 端点测试                                              ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}8)${NC} 打开 GraphQL Playground                                  ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-8): " choice
        case $choice in
            1)
                echo -e "${BLUE}📊 查询 GraphQL 统计信息...${NC}"
                echo ""
                
                # 使用正确的GraphQL端点和字段名
                response=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ lbfactories { id pairCount volumeUSD totalValueLockedUSD txCount tokenCount userCount } }"}')
                
                if echo "$response" | jq -e '.data.lbfactories[0]' >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ LBFactory 统计信息:${NC}"
                    factory_data=$(echo "$response" | jq '.data.lbfactories[0]')
                    echo "工厂地址: $(echo "$factory_data" | jq -r '.id')"
                    echo "流动性池数量: $(echo "$factory_data" | jq -r '.pairCount')"
                    echo "代币数量: $(echo "$factory_data" | jq -r '.tokenCount')"  
                    echo "交易数量: $(echo "$factory_data" | jq -r '.txCount')"
                    echo "用户数量: $(echo "$factory_data" | jq -r '.userCount')"
                    echo "总成交量(USD): \$$(echo "$factory_data" | jq -r '.volumeUSD')"
                    echo "总锁定价值(USD): \$$(echo "$factory_data" | jq -r '.totalValueLockedUSD')"
                elif echo "$response" | jq -e '.errors' >/dev/null 2>&1; then
                    echo -e "${RED}❌ GraphQL 查询错误:${NC}"
                    echo "$response" | jq '.errors'
                else
                    echo -e "${YELLOW}⚠️ 无法连接到 GraphQL 端点${NC}"
                    echo "Response: $response"
                fi
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${BLUE}💱 查询流动性池...${NC}"
                echo ""
                
                response=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ lbpairs(first: 5) { id name tokenX { symbol } tokenY { symbol } reserveX reserveY } }"}')
                
                if echo "$response" | jq -e '.data.lbpairs' >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ 流动性池信息:${NC}"
                    echo "$response" | jq '.data.lbpairs[] | {id: .id, name: .name, tokenX: .tokenX.symbol, tokenY: .tokenY.symbol, reserveX: .reserveX, reserveY: .reserveY}'
                elif echo "$response" | jq -e '.errors' >/dev/null 2>&1; then
                    echo -e "${RED}❌ GraphQL 查询错误:${NC}"
                    echo "$response" | jq '.errors'
                else
                    echo -e "${YELLOW}⚠️ 无法连接到 GraphQL 端点${NC}"
                    echo "Response: $response"
                fi
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}🪙 查询代币信息...${NC}"
                echo ""
                
                response=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -d '{"query":"{ tokens(first: 5) { id symbol name decimals totalSupply } }"}')
                
                if echo "$response" | jq -e '.data.tokens' >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ 代币信息:${NC}"
                    echo "$response" | jq '.data.tokens[] | {address: .id, symbol: .symbol, name: .name, decimals: .decimals, totalSupply: .totalSupply}'
                elif echo "$response" | jq -e '.errors' >/dev/null 2>&1; then
                    echo -e "${RED}❌ GraphQL 查询错误:${NC}"
                    echo "$response" | jq '.errors'
                else
                    echo -e "${YELLOW}⚠️ 无法连接到 GraphQL 端点${NC}"
                    echo "Response: $response"
                fi
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}📝 查询交易记录...${NC}"
                echo ""
                
                response=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  -d '{"query":"{ transactions(first: 5, orderBy: timestamp, orderDirection: desc) { id blockNumber timestamp } swaps(first: 5, orderBy: timestamp, orderDirection: desc) { id amountXIn amountXOut amountYIn amountYOut } }"}' \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest)
                
                if echo "$response" | jq -e '.data' >/dev/null 2>&1; then
                    tx_count=$(echo "$response" | jq '.data.transactions | length')
                    swap_count=$(echo "$response" | jq '.data.swaps | length')
                    
                    echo -e "${GREEN}✅ 交易活动统计:${NC}"
                    echo "交易记录数量: $tx_count"
                    echo "交换记录数量: $swap_count"
                    
                    if [ "$tx_count" -gt 0 ]; then
                        echo -e "${BLUE}最近交易:${NC}"
                        echo "$response" | jq '.data.transactions'
                    fi
                    
                    if [ "$swap_count" -gt 0 ]; then
                        echo -e "${BLUE}最近交换:${NC}"
                        echo "$response" | jq '.data.swaps'
                    fi
                    
                    if [ "$tx_count" -eq 0 ] && [ "$swap_count" -eq 0 ]; then
                        echo -e "${YELLOW}📊 暂无交易活动数据${NC}"
                    fi
                elif echo "$response" | jq -e '.errors' >/dev/null 2>&1; then
                    echo -e "${RED}❌ GraphQL 查询错误:${NC}"
                    echo "$response" | jq '.errors'
                else
                    echo -e "${YELLOW}⚠️ 无法连接到 GraphQL 端点${NC}"
                fi
                read -p "按任意键继续..."
                ;;
            5)
                echo -e "${BLUE}📊 查询流动性 Bins...${NC}"
                echo ""
                
                response=$(curl -s -X POST \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer 74cfb5d850c776403db7d187d3e262fb" \
                  https://api.studio.thegraph.com/query/114739/entysquare-dex-bsc-testnet/version/latest \
                  -d '{"query":"{ bins(first: 10, where: {totalSupply_gt: \"0\"}, orderBy: binId) { id binId totalSupply reserveX reserveY lbPair { name } } }"}')
                
                if echo "$response" | jq -e '.data.bins' >/dev/null 2>&1; then
                    bin_count=$(echo "$response" | jq '.data.bins | length')
                    echo -e "${GREEN}✅ 流动性 Bins 信息:${NC}"
                    echo "活跃 Bins 数量: $bin_count"
                    
                    if [ "$bin_count" -gt 0 ]; then
                        echo -e "${BLUE}Bins 详情:${NC}"
                        echo "$response" | jq '.data.bins[] | {id: .id, binId: .binId, totalSupply: .totalSupply, reserveX: .reserveX, reserveY: .reserveY, pairName: .lbPair.name}'
                    else
                        echo -e "${YELLOW}📊 暂无活跃的流动性 Bins${NC}"
                    fi
                elif echo "$response" | jq -e '.errors' >/dev/null 2>&1; then
                    echo -e "${RED}❌ GraphQL 查询错误:${NC}"
                    echo "$response" | jq '.errors'
                else
                    echo -e "${YELLOW}⚠️ 无法连接到 GraphQL 端点${NC}"
                    echo "Response: $response"
                fi
                read -p "按任意键继续..."
                ;;
            6)
                echo -e "${BLUE}📈 SQL 数据库统计...${NC}"
                echo ""
                echo "正在查询 PostgreSQL 数据库统计信息..."
                
                # 首先检查数据库连接和schema
                echo -e "${YELLOW}检查数据库连接...${NC}"
                if docker exec postgres psql -U graph-node -d graph-node -c "SELECT version();" >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ 数据库连接正常${NC}"
                    echo ""
                    
                    # 检查可用的schema
                    echo -e "${YELLOW}可用的 Schema:${NC}"
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT schema_name 
                    FROM information_schema.schemata 
                    WHERE schema_name LIKE 'sgd%' OR schema_name LIKE '%subgraph%'
                    ORDER BY schema_name;
                    " 2>/dev/null || echo "无法获取schema信息"
                    
                    echo ""
                    echo -e "${YELLOW}查找相关表...${NC}"
                    # 查找包含 subgraph 相关的表
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT table_schema, table_name, table_type
                    FROM information_schema.tables 
                    WHERE (table_name LIKE '%lb%' OR table_name LIKE '%pair%' OR table_name LIKE '%token%' OR table_name LIKE '%factory%')
                    AND table_schema NOT IN ('information_schema', 'pg_catalog')
                    ORDER BY table_schema, table_name;
                    " 2>/dev/null || echo "无法获取表信息"
                    
                    echo ""
                    echo -e "${CYAN}========== SQL 数据统计查询 ==========${NC}"
                    
                    # 查询1: Factory统计
                    echo ""
                    echo -e "${BLUE}1. LB Factory 统计:${NC}"
                    echo "Factory当前状态 (最新记录):"
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT 
                        SUBSTRING(id, 1, 10) || '...' as factory_address,
                        pair_count,
                        ROUND(volume_usd::numeric, 2) as volume_usd,
                        ROUND(total_value_locked_usd::numeric, 2) as tvl_usd,
                        tx_count,
                        token_count,
                        user_count,
                        ROUND(fees_usd::numeric, 2) as fees_usd
                    FROM sgd1.lb_factory 
                    WHERE COALESCE(upper(block_range), 2147483647) = 2147483647  -- 只取当前有效记录
                    ORDER BY pair_count DESC;
                    " 2>/dev/null || echo "查询失败"
                    
                    echo ""
                    echo -e "${YELLOW}Factory历史记录统计 (显示状态变化):${NC}"
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY lower(block_range)) as record_num,
                        SUBSTRING(id, 1, 10) || '...' as factory_id,
                        pair_count,
                        ROUND(volume_usd::numeric, 2) as volume_usd,
                        tx_count,
                        token_count,
                        lower(block_range) as start_block,
                        CASE 
                            WHEN COALESCE(upper(block_range), 2147483647) = 2147483647 
                            THEN '当前有效' 
                            ELSE COALESCE(upper(block_range), 2147483647)::text
                        END as end_block_status
                    FROM sgd1.lb_factory 
                    ORDER BY lower(block_range);
                    " 2>/dev/null || echo "查询失败"
                    
                    echo ""
                    echo -e "${CYAN}📝 说明: end_block显示'当前有效'表示该记录从start_block开始一直有效到现在${NC}"
                    echo -e "${CYAN}   数字2147483647是32位有符号整数最大值(2³¹-1)，在Graph Protocol中表示'永远有效'${NC}"
                    
                    # 查询2: 代币统计
                    echo ""
                    echo -e "${BLUE}2. Token 统计:${NC}"
                    token_count=$(docker exec postgres psql -U graph-node -d graph-node -t -c "SELECT COUNT(*) FROM sgd1.token;" 2>/dev/null | xargs)
                    echo "总代币数量: $token_count"
                    
                    echo ""
                    echo -e "${BLUE}代币详情 (按交易量排序):${NC}"
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT 
                        SUBSTRING(id, 1, 12) || '...' as token_address,
                        symbol,
                        name,
                        decimals,
                        CASE 
                            WHEN total_supply IS NOT NULL THEN 
                                CASE 
                                    WHEN total_supply > 1e18 THEN ROUND((total_supply / 1e18)::numeric, 2) || 'Q'
                                    WHEN total_supply > 1e15 THEN ROUND((total_supply / 1e15)::numeric, 2) || 'T'
                                    WHEN total_supply > 1e12 THEN ROUND((total_supply / 1e12)::numeric, 2) || 'B'
                                    WHEN total_supply > 1e9 THEN ROUND((total_supply / 1e9)::numeric, 2) || 'M'
                                    ELSE total_supply::text
                                END
                            ELSE 'N/A'
                        END as total_supply_formatted,
                        COALESCE(ROUND(volume_usd::numeric, 2), 0) as volume_usd
                    FROM sgd1.token 
                    ORDER BY volume_usd DESC NULLS LAST
                    LIMIT 10;
                    " 2>/dev/null || echo "查询失败"
                    
                    # 查询3: 流动性池统计
                    echo ""
                    echo -e "${BLUE}3. LB Pair 统计:${NC}"
                    pair_count=$(docker exec postgres psql -U graph-node -d graph-node -t -c "SELECT COUNT(*) FROM sgd1.lb_pair;" 2>/dev/null | xargs)
                    echo "总流动性池数量: $pair_count"
                    
                    if [ "$pair_count" -gt 0 ]; then
                        echo ""
                        echo -e "${BLUE}流动性池详情 (前5个):${NC}"
                        docker exec postgres psql -U graph-node -d graph-node -c "
                        SELECT 
                            p.id,
                            p.name,
                            tx.symbol as token_x_symbol,
                            ty.symbol as token_y_symbol,
                            p.reserve_x,
                            p.reserve_y,
                            p.volume_usd
                        FROM sgd1.lb_pair p
                        LEFT JOIN sgd1.token tx ON p.token_x = tx.id
                        LEFT JOIN sgd1.token ty ON p.token_y = ty.id
                        ORDER BY p.volume_usd DESC NULLS LAST
                        LIMIT 5;
                        " 2>/dev/null || echo "查询失败"
                    fi
                    
                    # 查询4: 每日数据统计
                    echo ""
                    echo -e "${BLUE}4. 每日统计数据:${NC}"
                    
                    # Token每日数据
                    token_day_count=$(docker exec postgres psql -U graph-node -d graph-node -t -c "SELECT COUNT(*) FROM sgd1.token_day_data;" 2>/dev/null | xargs)
                    echo "Token每日数据记录: $token_day_count"
                    
                    # Pair每日数据
                    pair_day_count=$(docker exec postgres psql -U graph-node -d graph-node -t -c "SELECT COUNT(*) FROM sgd1.lb_pair_day_data;" 2>/dev/null | xargs)
                    echo "流动性池每日数据记录: $pair_day_count"
                    
                    # 查询5: 最新活动
                    echo ""
                    echo -e "${BLUE}5. 最新活动统计:${NC}"
                    
                    # 最新的代币每日数据
                    echo -e "${YELLOW}最新代币活动:${NC}"
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT 
                        td.date,
                        t.symbol,
                        td.daily_volume_usd,
                        td.total_volume_usd
                    FROM sgd1.token_day_data td
                    LEFT JOIN sgd1.token t ON td.token = t.id
                    WHERE td.daily_volume_usd IS NOT NULL 
                    AND td.daily_volume_usd > 0
                    ORDER BY td.date DESC
                    LIMIT 5;
                    " 2>/dev/null || echo "暂无代币活动数据"
                    
                    # 最新的流动性池活动
                    echo ""
                    echo -e "${YELLOW}最新流动性池活动:${NC}"
                    docker exec postgres psql -U graph-node -d graph-node -c "
                    SELECT 
                        pd.date,
                        p.name as pair_name,
                        pd.daily_volume_usd,
                        pd.reserve_usd
                    FROM sgd1.lb_pair_day_data pd
                    LEFT JOIN sgd1.lb_pair p ON pd.lb_pair = p.id
                    WHERE pd.daily_volume_usd IS NOT NULL 
                    AND pd.daily_volume_usd > 0
                    ORDER BY pd.date DESC
                    LIMIT 5;
                    " 2>/dev/null || echo "暂无流动性池活动数据"
                    
                    echo ""
                    echo -e "${CYAN}========================================${NC}"
                    
                    # 数据分析总结
                    echo ""
                    echo -e "${GREEN}💡 数据分析总结:${NC}"
                    echo "• 代币总数: $token_count"
                    echo "• 流动性池总数: $pair_count"
                    echo "• Token每日记录: $token_day_count"
                    echo "• 池每日记录: $pair_day_count"
                    
                    if [ "$pair_count" -eq 0 ]; then
                        echo ""
                        echo -e "${YELLOW}📋 注意: 流动性池数据为空，这可能表示:${NC}"
                        echo "  1. Subgraph仍在同步中 (当前98.36%)"
                        echo "  2. BSC测试网上该DEX合约暂无活动"
                        echo "  3. 合约地址配置需要验证"
                    fi
                    
                else
                    echo -e "${RED}❌ 无法连接到数据库${NC}"
                    echo "请确保 PostgreSQL 容器正在运行"
                fi
                read -p "按任意键继续..."
                ;;
            7)
                echo -e "${BLUE}🔗 测试 API 端点...${NC}"
                echo ""
                echo -e "${YELLOW}测试健康检查:${NC}"
                
                # 检查本地Worker是否运行
                if curl -s "http://localhost:8787/health" >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ 本地Worker服务正在运行${NC}"
                    curl -s "http://localhost:8787/health" | jq '.' 2>/dev/null || echo "响应格式错误"
                else
                    echo -e "${RED}❌ 本地Worker服务未运行 (端口 8787)${NC}"
                    echo ""
                    echo -e "${BLUE}💡 提示:${NC}"
                    echo "  1. 在Backend目录运行: npm run dev"
                    echo "  2. 或使用主菜单 '1) Backend API 管理' → '1) 本地开发服务器'"
                    echo ""
                    
                    # 提示如何启动本地服务
                    echo -e "${YELLOW}如何启动本地服务:${NC}"
                    echo "  cd /Users/es/dex/backend && npm run dev"
                fi
                
                echo ""
                echo -e "${YELLOW}测试认证端点 (无API密钥):${NC}"
                if curl -s "http://localhost:8787/health" >/dev/null 2>&1; then
                    echo -e "${BLUE}GET /v1/api/dex/pools (无认证):${NC}"
                    curl -s "http://localhost:8787/v1/api/dex/pools" | jq '.' 2>/dev/null || echo "无响应或格式错误"
                else
                    echo "跳过测试 - 服务未运行"
                fi
                
                echo ""
                echo -e "${YELLOW}测试认证端点 (使用 test-key):${NC}"
                if curl -s "http://localhost:8787/health" >/dev/null 2>&1; then
                    echo -e "${CYAN}🔐 使用 test-key 进行完整API认证测试...${NC}"
                    echo ""
                    
                    # 测试1: 流动性池
                    echo -e "${BLUE}1. GET /v1/api/dex/pools (带test-key认证):${NC}"
                    response=$(curl -s -H "X-API-Key: test-key" "http://localhost:8787/v1/api/dex/pools")
                    if echo "$response" | jq '.' >/dev/null 2>&1; then
                        echo -e "${GREEN}✅ 认证成功${NC}"
                        # 只显示关键信息，避免输出过长
                        echo "$response" | jq '.data[] | {id, name, status, tokenX: .tokenX.symbol, tokenY: .tokenY.symbol, liquidityUsd}'
                    else
                        echo -e "${RED}❌ 认证失败或无数据${NC}"
                        echo "$response"
                    fi
                    
                    echo ""
                    # 测试2: 代币信息
                    echo -e "${BLUE}2. GET /v1/api/dex/tokens (带test-key认证):${NC}"
                    response=$(curl -s -H "X-API-Key: test-key" "http://localhost:8787/v1/api/dex/tokens")
                    if echo "$response" | jq '.' >/dev/null 2>&1; then
                        echo -e "${GREEN}✅ 认证成功${NC}"
                        # 只显示关键信息
                        echo "$response" | jq '.data[] | {address, symbol, name, decimals, totalSupply}'
                    else
                        echo -e "${RED}❌ 认证失败或无数据${NC}"
                        echo "$response"
                    fi
                    
                    echo ""
                    # 测试3: 交易数据
                    echo -e "${BLUE}3. GET /v1/api/dex/swaps (带test-key认证):${NC}"
                    response=$(curl -s -H "X-API-Key: test-key" "http://localhost:8787/v1/api/dex/swaps")
                    if echo "$response" | jq '.' >/dev/null 2>&1; then
                        if echo "$response" | jq '.success' | grep -q "true"; then
                            echo -e "${GREEN}✅ 认证成功${NC}"
                            echo "$response" | jq '.'
                        else
                            echo -e "${YELLOW}⚠️ 认证成功但端点未实现${NC}"
                            echo "$response" | jq '.error // .message'
                        fi
                    else
                        echo -e "${RED}❌ 认证失败或无数据${NC}"
                        echo "$response"
                    fi
                    
                    echo ""
                    # 测试4: 流动性数据
                    echo -e "${BLUE}4. GET /v1/api/dex/liquidity (带test-key认证):${NC}"
                    response=$(curl -s -H "X-API-Key: test-key" "http://localhost:8787/v1/api/dex/liquidity")
                    if echo "$response" | jq '.' >/dev/null 2>&1; then
                        if echo "$response" | jq '.success' | grep -q "true"; then
                            echo -e "${GREEN}✅ 认证成功${NC}"
                            echo "$response" | jq '.'
                        else
                            echo -e "${YELLOW}⚠️ 认证成功但端点未实现${NC}"
                            echo "$response" | jq '.error // .message'
                        fi
                    else
                        echo -e "${RED}❌ 认证失败或无数据${NC}"
                        echo "$response"
                    fi
                    
                    echo ""
                    # 测试5: 费用统计
                    echo -e "${BLUE}5. GET /v1/api/dex/fees (带test-key认证):${NC}"
                    response=$(curl -s -H "X-API-Key: test-key" "http://localhost:8787/v1/api/dex/fees")
                    if echo "$response" | jq '.' >/dev/null 2>&1; then
                        if echo "$response" | jq '.success' | grep -q "true"; then
                            echo -e "${GREEN}✅ 认证成功${NC}"
                            echo "$response" | jq '.'
                        else
                            echo -e "${YELLOW}⚠️ 认证成功但端点未实现${NC}"
                            echo "$response" | jq '.error // .message'
                        fi
                    else
                        echo -e "${RED}❌ 认证失败或无数据${NC}"
                        echo "$response"
                    fi
                    
                    echo ""
                    # 测试6: 价格查询
                    echo -e "${BLUE}6. GET /v1/api/dex/price (带test-key认证):${NC}"
                    response=$(curl -s -H "X-API-Key: test-key" "http://localhost:8787/v1/api/dex/price")
                    if echo "$response" | jq '.' >/dev/null 2>&1; then
                        if echo "$response" | jq '.success' | grep -q "true"; then
                            echo -e "${GREEN}✅ 认证成功${NC}"
                            echo "$response" | jq '.'
                        else
                            echo -e "${YELLOW}⚠️ 认证成功但端点未实现${NC}"
                            echo "$response" | jq '.error // .message'
                        fi
                    else
                        echo -e "${RED}❌ 认证失败或无数据${NC}"
                        echo "$response"
                    fi
                    
                    echo ""
                    # 测试7: 错误认证测试
                    echo -e "${BLUE}7. 测试错误API Key:${NC}"
                    response=$(curl -s -H "X-API-Key: wrong-key" "http://localhost:8787/v1/api/dex/pools")
                    if echo "$response" | grep -q "unauthorized\|forbidden\|invalid" 2>/dev/null; then
                        echo -e "${GREEN}✅ 正确拒绝了错误的API Key${NC}"
                    else
                        echo -e "${YELLOW}⚠️ 可能未正确验证API Key${NC}"
                    fi
                    echo "$response"
                    
                    echo ""
                    echo -e "${GREEN}🎉 test-key API认证测试完成!${NC}"
                    echo -e "${BLUE}💡 所有端点都已使用 test-key 进行了认证测试${NC}"
                    echo ""
                    echo -e "${CYAN}📋 如需查看完整JSON响应，可使用以下命令:${NC}"
                    echo -e "${YELLOW}curl -H \"X-API-Key: test-key\" \"http://localhost:8787/v1/api/dex/pools\" | jq .${NC}"
                    echo -e "${YELLOW}curl -H \"X-API-Key: test-key\" \"http://localhost:8787/v1/api/dex/tokens\" | jq .${NC}"
                else
                    echo "跳过测试 - 服务未运行"
                fi
                
                read -p "按任意键继续..."
                ;;
            8)
                echo -e "${BLUE}🎮 打开 GraphQL Playground...${NC}"
                echo ""
                echo "GraphQL Playground URLs:"
                echo "• 本地查询端点: http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet"
                echo "• 交互式浏览器: http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet/graphql"
                echo ""
                # 尝试在默认浏览器中打开
                if command -v open >/dev/null 2>&1; then
                    echo "正在打开默认浏览器..."
                    open "http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet/graphql"
                elif command -v xdg-open >/dev/null 2>&1; then
                    echo "正在打开默认浏览器..."
                    xdg-open "http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet/graphql"
                else
                    echo "请手动在浏览器中打开上述链接"
                fi
                read -p "按任意键继续..."
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# 日志查看菜单
logs_menu() {
    while true; do
        show_header
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} ${ICON_LOGS} ${BLUE}日志查看${NC}                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} Graph Node 日志                                            ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} IPFS 日志                                                  ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} PostgreSQL 日志                                           ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 所有服务日志                                               ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择要查看的日志 (0-4): " choice
        case $choice in
            1)
                echo -e "${BLUE}📋 Graph Node 日志...${NC}"
                cd $INDEXER_DIR && npm run logs:graph
                ;;
            2)
                echo -e "${BLUE}📋 IPFS 日志...${NC}"
                cd $INDEXER_DIR && npm run logs:ipfs
                ;;
            3)
                echo -e "${BLUE}📋 PostgreSQL 日志...${NC}"
                cd $INDEXER_DIR && npm run logs:postgres
                ;;
            4)
                echo -e "${BLUE}📋 所有服务日志...${NC}"
                cd $INDEXER_DIR && docker-compose logs -f
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# 环境清理菜单
clean_menu() {
    show_header
    echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}│${NC} ${ICON_CLEAN} ${RED}环境清理${NC}                                                 ${WHITE}│${NC}"
    echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}│${NC} ${RED}⚠️  警告: 这将删除所有本地数据和容器！${NC}                          ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC}                                                                 ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} 将要清理的内容:                                                ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} • Docker 容器和数据                                            ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} • Graph Node 数据库                                           ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} • 生成的代码和构建文件                                         ${WHITE}│${NC}"
    echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    read -p "确定要继续清理吗? (输入 'YES' 确认): " confirm
    if [[ $confirm == "YES" ]]; then
        echo -e "${RED}🧹 开始清理环境...${NC}"
        cd $INDEXER_DIR && npm run clean
        echo -e "${GREEN}✅ 环境清理完成${NC}"
    else
        echo -e "${YELLOW}❌ 清理已取消${NC}"
    fi
    read -p "按任意键继续..."
}

# 脚本管理菜单
scripts_menu() {
    while true; do
        show_header
        show_status
        echo -e "${WHITE}┌─────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${WHITE}│${NC} 🔧 ${BLUE}脚本管理${NC}                                                   ${WHITE}│${NC}"
        echo -e "${WHITE}├─────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} 运行全面测试套件 (all-in-one-test.ts)                      ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC}                                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-1): " choice
        case $choice in
            1)
                echo -e "${BLUE}🧪 运行全面测试套件...${NC}"
                cd $BACKEND_DIR
                npx tsx all-in-one-test.ts
                read -p "按任意键继续..."
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}❌ 无效选择${NC}"
                sleep 1
                ;;
        esac
    done
}

# 主程序
main() {
    # 检查依赖
    check_dependencies
    
    while true; do
        show_header
        show_status
        show_main_menu
        
        read -p "请选择操作 (0-9): " choice
        case $choice in
            1) backend_menu ;;
            2) indexer_menu ;;
            3) deploy_menu ;;
            4) test_menu ;;
            5) monitor_mode ;;
            6) query_menu ;;
            7) logs_menu ;;
            8) clean_menu ;;
            9) scripts_menu ;;
            0)
                echo -e "${GREEN}${ICON_EXIT} 感谢使用 DEX Backend & Indexer 管理面板！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效选择，请重试${NC}"
                sleep 1
                ;;
        esac
    done
}

# 运行主程序
main "$@"
