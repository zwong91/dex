#!/bin/bash

# DEX Backend Deployment Script
# 检查部署准备情况并提供部署指南

set -e  # 遇到错误立即退出

echo "🚀 DEX Backend Deployment Checker"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 检查 Cloudflare API Token
check_api_token() {
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        log_warning "环境变量 CLOUDFLARE_API_TOKEN 未设置"
        echo "   注意：某些高级功能可能需要 API Token"
        echo "   设置方法: export CLOUDFLARE_API_TOKEN=你的CloudflareAPIToken"
        return 1
    fi
    log_success "Cloudflare API Token 已配置"
    return 0
}

# 检查必要工具
check_tools() {
    log_info "检查必要工具..."
    
    for cmd in jq curl npx; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd 命令未找到，请先安装"
            case $cmd in
                jq) echo "   Ubuntu/Debian: sudo apt-get install jq" ;;
                curl) echo "   Ubuntu/Debian: sudo apt-get install curl" ;;
                npx) echo "   请安装 Node.js 和 npm" ;;
            esac
            exit 1
        fi
    done
    
    log_success "必要工具检查通过"
}

# 检查配置文件
check_config_files() {
    log_info "检查配置文件..."

    if [ -f "wrangler.toml" ]; then
        log_success "wrangler.toml exists"
        
        # 检查是否还有占位符
        if grep -q "YOUR_ACCOUNT_ID_HERE" wrangler.toml; then
            log_warning "Account ID needs to be set in wrangler.toml"
            echo "   Run: npx wrangler whoami to get your account ID"
            exit 1
        else
            log_success "Account ID is configured"
        fi
        
        if grep -q "YOUR_NEW_DEX_DATABASE_ID_HERE" wrangler.toml; then
            log_warning "Database ID needs to be set in wrangler.toml"
            echo "   Run: npx wrangler d1 create d1-dex-database"
            exit 1
        else
            log_success "Database ID is configured"
        fi
    else
        log_error "wrangler.toml not found"
        exit 1
    fi
}

# 获取配置信息
get_worker_config() {
    log_info "读取 Worker 配置..."
    
    SCRIPT_NAME=$(grep '^name' wrangler.toml | head -n1 | cut -d'=' -f2 | tr -d ' "' | tr -d "'")
    ACCOUNT_ID=$(grep '^account_id' wrangler.toml | head -n1 | cut -d'=' -f2 | tr -d ' "' | tr -d "'")
    
    if [ -z "$SCRIPT_NAME" ] || [ -z "$ACCOUNT_ID" ]; then
        log_error "无法从 wrangler.toml 读取 name 或 account_id"
        echo "   请确保 wrangler.toml 包含以下配置:"
        echo "   name = \"your-worker-name\""
        echo "   account_id = \"your-account-id\""
        exit 1
    fi
    
    log_success "Worker 配置读取成功: $SCRIPT_NAME (Account: ${ACCOUNT_ID:0:8}...)"
}

# 检查认证状态
check_authentication() {
    echo ""
    log_info "检查认证状态..."
    if npx wrangler whoami &>/dev/null; then
        log_success "已登录到 Cloudflare"
        npx wrangler whoami
    else
        log_error "未登录到 Cloudflare"
        echo "   Run: npx wrangler login"
        exit 1
    fi
}

# 检查TypeScript编译
check_typescript() {
    echo ""
    log_info "检查 TypeScript 编译..."
    if npx tsc --noEmit; then
        log_success "TypeScript 编译成功"
    else
        log_error "TypeScript 编译失败"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    echo ""
    log_info "检查依赖..."
    if [ -d "node_modules" ]; then
        log_success "依赖已安装"
    else
        log_error "依赖未安装"
        echo "   Run: npm install"
        exit 1
    fi
}

# 检查 wrangler 版本和可用命令
check_wrangler_commands() {
    log_info "检查 wrangler 版本和可用命令..."
    
    # 显示 wrangler 版本
    local wrangler_version=$(npx wrangler --version 2>/dev/null | head -n1)
    log_info "Wrangler 版本: $wrangler_version"
    
    # 检查 triggers 命令是否存在（新版本）
    if npx wrangler triggers --help &>/dev/null; then
        log_success "triggers 命令可用（新版本 wrangler）"
        log_info "可用的 triggers 子命令:"
        npx wrangler triggers --help 2>/dev/null | grep -E "^\s+(deploy)" | sed 's/^/   /' || true
    else
        log_warning "triggers 命令不可用"
    fi
    
    # 检查是否还有 schedules 命令（旧版本）
    if npx wrangler schedules --help &>/dev/null; then
        log_success "schedules 命令可用（旧版本 wrangler）"
    else
        log_info "schedules 命令不可用（使用新版本 triggers）"
    fi
    
    # 显示当前 Worker 信息
    log_info "当前 Worker 信息:"
    echo "   名称: $SCRIPT_NAME"
    echo "   账户: ${ACCOUNT_ID:0:8}..."
}

# 部署函数
deploy_worker() {
    echo ""
    log_info "开始部署到 Cloudflare Workers..."
    
    # 检查是否有 package.json 中的 deploy 脚本
    if grep -q '"deploy"' package.json; then
        log_info "使用 npm run deploy 部署..."
        if npm run deploy; then
            log_success "部署到 Cloudflare Workers 成功"
            return 0
        else
            log_error "npm run deploy 失败"
            return 1
        fi
    else
        # 直接使用 wrangler deploy
        log_info "使用 npx wrangler deploy 部署..."
        if npx wrangler deploy; then
            log_success "部署到 Cloudflare Workers 成功"
            return 0
        else
            log_error "wrangler deploy 失败"
            return 1
        fi
    fi
}

# 迁移数据库
migrate_database() {
    echo ""
    log_info "迁移远程 D1 数据库..."
    
    if npx wrangler d1 migrations apply d1-dex-database --remote; then
        log_success "数据库迁移完成"
        
        echo ""
        log_info "检查远程 D1 数据库表..."
        npx wrangler d1 execute d1-dex-database --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
        
        return 0
    else
        log_error "数据库迁移失败"
        return 1
    fi
}

# 检查本地开发服务器状态
check_local_server() {
    echo ""
    echo "🖥️  Local Development Server"
    echo "============================"
    if curl -s http://localhost:8787/health &>/dev/null; then
        log_success "本地服务器运行在 http://localhost:8787"
        local status=$(curl -s http://localhost:8787/health | jq -r '.status' 2>/dev/null || echo 'ok')
        echo "   API Status: $status"
    else
        log_warning "本地服务器未运行"
        echo "   启动命令: npm run dev"
    fi
}

# 显示部署后指引
show_post_deployment_info() {
    echo ""
    echo "🎯 部署完成总结"
    echo "================"
    log_success "配置检查完成"
    log_success "代码编译成功"
    log_success "依赖安装完成"
    log_success "Worker 部署成功"
    log_success "数据库迁移完成"
    log_success "定时器配置完成"
    
    echo ""
    echo "📝 下一步操作:"
    echo "1. 测试部署的 API:"
    echo "   curl https://$SCRIPT_NAME.your-subdomain.workers.dev/health"
    echo ""
    echo "2. 查看 Worker 日志:"
    echo "   npx wrangler tail"
    echo ""
    echo "3. 管理定时器:"
    echo "   查看当前部署: npx wrangler deployments list"
    echo "   重新部署: npx wrangler deploy"
    echo ""
    echo "   定时器配置在 wrangler.toml 中:"
    echo '   [triggers]'
    echo '   crons = ['
    echo '     "*/5 * * * *",    # 每5分钟'
    echo '     "0 * * * *",      # 每小时'
    echo '     "0 2 * * 7"       # 每周日2点'
    echo '   ]'
    echo ""
    echo "4. 测试定时任务:"
    echo "   ./test-cron-jobs.sh"
    echo ""
    
    local local_status
    if curl -s http://localhost:8787/health &>/dev/null; then
        local_status="运行中"
    else
        local_status="需要启动 (npm run dev)"
    fi
    
    echo "🏁 项目状态:"
    echo "- 远程部署: ✅ 完成"
    echo "- 数据库: ✅ 已迁移"
    echo "- 定时器: ✅ 已配置"
    echo "- 本地开发: $local_status"
    echo ""
    log_success "DEX 后端部署完成! 🚀"
}

# 主函数
main() {
    # 前置检查
    check_api_token  # 不强制要求，但会给出提示
    check_tools
    check_config_files
    get_worker_config
    check_authentication
    check_typescript
    check_dependencies
    
    # 检查定时器配置
    log_info "检查定时器配置..."
    if grep -q "\[triggers\]" wrangler.toml && grep -q "crons" wrangler.toml; then
        local cron_count=$(grep -A 10 "\[triggers\]" wrangler.toml | grep -o '"[^"]*"' | wc -l)
        log_success "定时器配置已存在 ($cron_count 个定时器)"
        echo "📋 配置的定时器:"
        grep -A 10 "\[triggers\]" wrangler.toml | grep '"' | sed 's/^/   /'
    else
        log_warning "未找到定时器配置"
        echo "   请在 wrangler.toml 中添加以下配置："
        echo '   [triggers]'
        echo '   crons = ['
        echo '     "*/5 * * * *",    # Every 5 minutes'
        echo '     "0 * * * *",      # Every hour'
        echo '     "0 2 * * 7"       # Every Sunday at 2 AM'
        echo '   ]'
    fi
    
    # 检查 wrangler 命令
    check_wrangler_commands
    
    # 部署流程
    echo ""
    log_info "所有检查通过，开始部署流程..."
    
    # 部署 Worker
    if ! deploy_worker; then
        log_error "Worker 部署失败，停止执行"
        exit 1
    fi
    
    # 迁移数据库
    if ! migrate_database; then
        log_error "数据库迁移失败，但 Worker 已部署"
        exit 1
    fi
    
    # 检查本地服务器
    check_local_server
    
    # 显示完成信息
    show_post_deployment_info
}

# 错误处理
trap 'log_error "脚本执行过程中发生错误，请检查上面的错误信息"' ERR

# 运行主程序
main "$@"