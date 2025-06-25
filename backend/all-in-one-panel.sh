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
    echo -e "${CYAN}║${NC} ${GREEN}📍 Backend: $BACKEND_DIR${NC}"
    echo -e "${CYAN}║${NC} ${GREEN}📍 Indexer: $INDEXER_DIR${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 获取服务状态
get_api_status() {
    if curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" >/dev/null 2>&1; then
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
    echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} ${ICON_API} Backend API 管理    ${YELLOW}6)${NC} ${ICON_QUERY} 查询工具              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} ${ICON_INDEXER} Graph Indexer 管理  ${YELLOW}7)${NC} ${ICON_LOGS} 日志查看              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} ${ICON_DEPLOY} 部署管理           ${YELLOW}8)${NC} ${ICON_CLEAN} 环境清理              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} ${ICON_TEST} 测试工具            ${YELLOW}9)${NC} 🔧 脚本管理              ${WHITE}│${NC}"
    echo -e "${WHITE}│${NC} ${YELLOW}5)${NC} ${ICON_MONITOR} 实时监控            ${YELLOW}0)${NC} ${ICON_EXIT} 退出                   ${WHITE}│${NC}"
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
                curl -s "https://dex-backend-serverless.jongun2038.workers.dev/" | jq '.' || echo "无法连接"
                echo ""
                echo -e "${YELLOW}Health Check:${NC}"
                curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" | jq '.' || echo "无法连接"
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
                # 使用indexer目录下的monitor.sh脚本
                cd $INDEXER_DIR && ./monitor.sh
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
                curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" | jq '.' 2>/dev/null || echo "离线"
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
                curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" | jq '.'
                echo ""
                echo -e "${YELLOW}测试认证 (无密钥):${NC}"
                curl -s "https://dex-backend-serverless.jongun2038.workers.dev/v1/api/dex/pools" | jq '.'
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}📊 测试 GraphQL 查询...${NC}"
                echo ""
                echo -e "${YELLOW}查询流动性池:${NC}"
                curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ lbPairs { id } }"}' \
                  | jq '.data.lbPairs | length' 2>/dev/null || echo "查询失败"
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}⚡ 性能测试...${NC}"
                echo ""
                echo -e "${YELLOW}API 响应时间测试:${NC}"
                time curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" >/dev/null
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
        if curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" >/dev/null 2>&1; then
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
                curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ lbFactories { pairCount volumeUSD totalValueLockedUSD txCount tokenCount userCount } }"}' \
                  | jq '.data.lbFactories[0]' 2>/dev/null || echo "查询失败"
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${BLUE}💱 查询流动性池...${NC}"
                curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ lbPairs(first: 5) { id name tokenX { symbol } tokenY { symbol } } }"}' \
                  | jq '.data.lbPairs' 2>/dev/null || echo "查询失败"
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}🪙 查询代币信息...${NC}"
                curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ tokens(first: 5) { id symbol name decimals } }"}' \
                  | jq '.data.tokens' 2>/dev/null || echo "查询失败"
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}📝 查询交易记录...${NC}"
                curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ traces(first: 5, orderBy: id, orderDirection: desc) { id type lbPair binId txHash } }"}' \
                  | jq '.data.traces' 2>/dev/null || echo "查询失败"
                read -p "按任意键继续..."
                ;;
            5)
                echo -e "${BLUE}📊 查询流动性 Bins...${NC}"
                curl -s -X POST http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet \
                  -H "Content-Type: application/json" \
                  -d '{"query":"{ bins(first: 10, where: {totalSupply_gt: \"0\"}, orderBy: binId) { id binId totalSupply reserveX reserveY lbPair { name } } }"}' \
                  | jq '.data.bins' 2>/dev/null || echo "查询失败"
                read -p "按任意键继续..."
                ;;
            6)
                echo -e "${BLUE}📈 SQL 数据库统计...${NC}"
                echo ""
                echo "正在查询 PostgreSQL 数据库统计信息..."
                docker exec -t postgres psql -U graph-node -d graph-node -c "
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
                " 2>/dev/null || echo "无法连接到数据库"
                read -p "按任意键继续..."
                ;;
            7)
                echo -e "${BLUE}🔗 测试 API 端点...${NC}"
                echo ""
                echo -e "${YELLOW}健康检查:${NC}"
                curl -s "https://dex-backend-serverless.jongun2038.workers.dev/health" | jq '.'
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
        echo -e "${WHITE}│${NC} ${YELLOW}Backend Scripts:${NC}                                                ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}1)${NC} 运行全面测试套件 (all-in-one-test.ts)                      ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC}                                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}Indexer Scripts (已整合):${NC}                                        ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}2)${NC} 管理功能 (manage.sh → 已整合到主面板)                       ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}3)${NC} 同步监控 (monitor.sh → 已整合到实时监控)                    ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}4)${NC} 查询工具 (query.sh → 已整合到查询工具)                      ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}5)${NC} 同步检查 (check-sync.sh → 已整合到状态检查)                 ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}6)${NC} 主网部署 (deploy-mainnet.sh → 已整合到部署管理)             ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}7)${NC} 测试网部署 (deploy-testnet.sh → 已整合到部署管理)           ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC}                                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}│${NC} ${YELLOW}0)${NC} 返回主菜单                                                 ${WHITE}│${NC}"
        echo -e "${WHITE}└─────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "请选择操作 (0-7): " choice
        case $choice in
            1)
                echo -e "${BLUE}🧪 运行全面测试套件...${NC}"
                cd $BACKEND_DIR
                npx tsx all-in-one-test.ts
                read -p "按任意键继续..."
                ;;
            2)
                echo -e "${BLUE}🔧 Indexer 管理功能 (已整合):${NC}"
                echo ""
                echo "这些功能现已集成到主面板中："
                echo "• 启动/停止/重启服务 → Graph Indexer 管理菜单"
                echo "• 查看状态 → 主面板状态显示"
                echo "• 测试查询 → 查询工具菜单"
                echo "• 快速状态 → Graph Indexer 管理菜单"
                echo ""
                echo "请使用主菜单中对应的功能。"
                read -p "按任意键继续..."
                ;;
            3)
                echo -e "${BLUE}🔄 实时同步监控 (已整合)...${NC}"
                echo ""
                echo "此功能已集成到主面板的实时监控中。"
                echo "请使用主菜单中的 '5) 实时监控' 功能。"
                read -p "按任意键继续..."
                ;;
            4)
                echo -e "${BLUE}🔍 查询工具功能 (已整合):${NC}"
                echo ""
                echo "这些查询功能现已集成到主面板中："
                echo "• 查询工厂信息 → 查询工具菜单"
                echo "• 查询交易对 → 查询工具菜单"
                echo "• 查询代币 → 查询工具菜单"
                echo "• 查询 Bins → 查询工具菜单"
                echo "• 查询交易记录 → 查询工具菜单"
                echo "• SQL 统计 → 查询工具菜单"
                echo ""
                echo "请使用主菜单中的 '6) 查询工具' 功能。"
                read -p "按任意键继续..."
                ;;
            5)
                echo -e "${BLUE}🔄 同步状态检查 (已整合)...${NC}"
                echo ""
                echo "此功能已集成到主面板中。"
                echo "请使用 '2) Graph Indexer 管理' → '6) 快速状态检查' 功能。"
                read -p "按任意键继续..."
                ;;
            6)
                echo -e "${BLUE}🌐 主网部署 (已整合)...${NC}"
                echo ""
                echo "此功能已集成到主面板中。"
                echo "请使用 '3) 部署管理' 或 '2) Graph Indexer 管理' → '8) 部署到主网/测试网' 功能。"
                read -p "按任意键继续..."
                ;;
            7)
                echo -e "${BLUE}🧪 测试网部署 (已整合)...${NC}"
                echo ""
                echo "此功能已集成到主面板中。"
                echo "请使用 '3) 部署管理' 或 '2) Graph Indexer 管理' → '8) 部署到主网/测试网' 功能。"
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
