#!/bin/bash

# 全功能缓存管理脚本
# 包含清理、强制刷新、状态检查等功能

set -e  # 遇到错误立即退出

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
PRODUCTION_URL="${PRODUCTION_URL:-https://dex-backend-serverless.your-domain.workers.dev}"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_success() { echo -e "${GREEN}✅ $1${NC}"; }
echo_error() { echo -e "${RED}❌ $1${NC}"; }
echo_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
echo_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

show_help() {
    echo "🛠️  DEX 缓存管理工具"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  clear           清理所有缓存"
    echo "  refresh         强制刷新主要端点"
    echo "  status          检查缓存状态"
    echo "  test            测试缓存功能"
    echo "  prod            使用生产环境 URL"
    echo "  help            显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  API_BASE_URL    本地 API 基础 URL (默认: http://localhost:8787)"
    echo "  PRODUCTION_URL  生产环境 URL"
    echo ""
    echo "示例:"
    echo "  $0 clear                    # 清理本地缓存"
    echo "  $0 prod clear              # 清理生产环境缓存"
    echo "  $0 refresh                 # 强制刷新本地端点"
    echo "  API_BASE_URL=http://localhost:3000 $0 test"
}

clear_cache() {
    local url="$1"
    echo_info "清理所有缓存..."
    echo_info "API 端点: $url"
    
    response=$(curl -s -X POST "$url/v1/api/cache/internal/clear-all" \
        -H "Content-Type: application/json" \
        -w "%{http_code}" -o /tmp/cache_response.json)
    
    if [ "$response" = "200" ]; then
        cat /tmp/cache_response.json | jq '.' 2>/dev/null || cat /tmp/cache_response.json
        
        deleted_count=$(cat /tmp/cache_response.json | jq -r '.deletedCount // 0' 2>/dev/null)
        if [ "$deleted_count" != "0" ] && [ "$deleted_count" != "null" ]; then
            echo_success "成功清理了 $deleted_count 个缓存条目"
        else
            echo_success "缓存已清理（没有找到缓存条目）"
        fi
    else
        echo_error "清理失败 (HTTP $response)"
        cat /tmp/cache_response.json 2>/dev/null || echo "无响应内容"
        exit 1
    fi
    
    rm -f /tmp/cache_response.json
}

refresh_endpoints() {
    local url="$1"
    echo_info "强制刷新主要端点..."
    
    endpoints=(
        "/v1/api/dex/health"
        "/v1/api/dex/subgraph-meta"
        "/v1/api/dex/tokens/bsc?limit=50&offset=0"
        "/v1/api/dex/pools/bsc?limit=50&offset=0&orderBy=totalValueLockedUSD&orderDirection=desc"
    )
    
    success_count=0
    total_count=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        echo_info "刷新: $endpoint"
        
        response=$(curl -s -w "%{http_code}" \
            -H "X-Force-Refresh: true" \
            "$url$endpoint" \
            -o /dev/null)
        
        if [ "$response" = "200" ]; then
            echo_success "  成功 (HTTP $response)"
            ((success_count++))
        else
            echo_error "  失败 (HTTP $response)"
        fi
        
        sleep 0.2  # 小延迟避免过载
    done
    
    echo ""
    echo_info "刷新结果: $success_count/$total_count 成功"
    
    if [ $success_count -eq $total_count ]; then
        echo_success "所有端点已成功刷新!"
    else
        echo_warning "部分端点刷新失败"
    fi
}

check_status() {
    local url="$1"
    echo_info "检查缓存状态..."
    
    # 测试健康检查端点
    echo_info "测试健康检查端点..."
    response=$(curl -s -v "$url/v1/api/dex/health" 2>&1)
    
    cache_status=$(echo "$response" | grep "X-Cache-Status:" | awk '{print $3}' | tr -d '\r')
    cache_ttl=$(echo "$response" | grep "X-Cache-TTL:" | awk '{print $3}' | tr -d '\r')
    
    if [ -n "$cache_status" ]; then
        echo_success "缓存状态: $cache_status"
        [ -n "$cache_ttl" ] && echo_info "缓存 TTL: $cache_ttl 秒"
    else
        echo_warning "无法获取缓存状态"
    fi
    
    # 检查响应时间
    echo_info "测试响应时间..."
    time_total=$(curl -s -w "%{time_total}" "$url/v1/api/dex/health" -o /dev/null)
    echo_info "响应时间: ${time_total}s"
}

test_cache() {
    local url="$1"
    echo_info "测试缓存功能..."
    
    # 1. 清理缓存
    echo_info "步骤 1: 清理缓存"
    clear_cache "$url"
    
    echo ""
    
    # 2. 第一次访问 (MISS)
    echo_info "步骤 2: 第一次访问（应该是 MISS）"
    response=$(curl -s -v "$url/v1/api/dex/health" 2>&1)
    cache_status=$(echo "$response" | grep "X-Cache-Status:" | awk '{print $3}' | tr -d '\r')
    
    if [ "$cache_status" = "MISS" ]; then
        echo_success "第一次访问: MISS ✓"
    else
        echo_error "第一次访问: $cache_status (期望 MISS)"
    fi
    
    # 3. 第二次访问 (HIT)
    echo_info "步骤 3: 第二次访问（应该是 HIT）"
    sleep 1
    response=$(curl -s -v "$url/v1/api/dex/health" 2>&1)
    cache_status=$(echo "$response" | grep "X-Cache-Status:" | awk '{print $3}' | tr -d '\r')
    
    if [ "$cache_status" = "HIT" ]; then
        echo_success "第二次访问: HIT ✓"
        echo_success "缓存功能正常工作!"
    else
        echo_error "第二次访问: $cache_status (期望 HIT)"
        echo_error "缓存功能可能有问题"
    fi
}

# 解析命令行参数
use_production=false
command=""

while [[ $# -gt 0 ]]; do
    case $1 in
        prod|production)
            use_production=true
            shift
            ;;
        clear|refresh|status|test|help)
            command="$1"
            shift
            ;;
        *)
            echo_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 确定使用的 URL
if [ "$use_production" = true ]; then
    api_url="$PRODUCTION_URL"
    echo_warning "使用生产环境: $api_url"
else
    api_url="$API_BASE_URL"
    echo_info "使用本地环境: $api_url"
fi

# 执行命令
case $command in
    clear)
        clear_cache "$api_url"
        ;;
    refresh)
        refresh_endpoints "$api_url"
        ;;
    status)
        check_status "$api_url"
        ;;
    test)
        test_cache "$api_url"
        ;;
    help|"")
        show_help
        ;;
    *)
        echo_error "未知命令: $command"
        show_help
        exit 1
        ;;
esac
