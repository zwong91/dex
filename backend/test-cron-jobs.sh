#!/bin/bash

# Cron Jobs 测试脚本
# 用于测试 Cloudflare Worker 的定时任务功能

set -e

echo "🧪 DEX Backend Cron Jobs 测试脚本"
echo "=================================="

# 检查依赖
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误: wrangler CLI 未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ 错误: curl 未安装"
    exit 1
fi

# 配置
WORKER_NAME="dex-backend"
LOCAL_URL="http://localhost:8787"
TIMEOUT=30

# 函数：等待本地服务器启动
wait_for_server() {
    echo "⏳ 等待本地服务器启动..."
    for i in {1..30}; do
        if curl -s "$LOCAL_URL/health" >/dev/null 2>&1; then
            echo "✅ 服务器已启动"
            return 0
        fi
        sleep 1
    done
    echo "❌ 服务器启动超时"
    return 1
}

# 函数：测试特定的 cron job
test_cron_job() {
    local cron_pattern="$1"
    local description="$2"
    local encoded_pattern=$(echo "$cron_pattern" | sed 's/ /%20/g')
    
    echo ""
    echo "📅 测试 Cron Job: $description"
    echo "   Pattern: $cron_pattern"
    echo "   URL: $LOCAL_URL/__scheduled?cron=$encoded_pattern"
    
    local response=$(curl -s -w "%{http_code}" -X POST "$LOCAL_URL/__scheduled?cron=$encoded_pattern" 2>/dev/null || echo "000")
    
    if [[ "$response" == *"200" ]]; then
        echo "✅ 成功: $description"
    else
        echo "❌ 失败: $description (HTTP $response)"
    fi
}

# 主菜单
show_menu() {
    echo ""
    echo "请选择测试选项:"
    echo "1) 运行所有单元测试"
    echo "2) 启动本地开发服务器并测试 Cron Jobs"
    echo "3) 仅测试 Cron Jobs (需要服务器已运行)"
    echo "4) 测试特定 Cron Job"
    echo "5) 查看 Cron Job 配置"
    echo "6) 部署后测试 (生产环境)"
    echo "7) 查看实时日志"
    echo "0) 退出"
}

# 运行单元测试
run_unit_tests() {
    echo "🧪 运行 Cron Jobs 单元测试..."
    
    # 直接使用 vitest 运行测试
    if npx vitest run test/scheduled-simple.spec.ts --reporter=verbose; then
        echo "✅ 单元测试通过"
    else
        echo "❌ 单元测试失败"
    fi
}

# 启动开发服务器并测试
start_dev_and_test() {
    echo "🚀 启动本地开发服务器..."
    
    # 在后台启动 wrangler dev
    wrangler dev --local &
    DEV_PID=$!
    
    # 设置陷阱以在脚本退出时清理
    trap "echo '🛑 停止开发服务器...'; kill $DEV_PID 2>/dev/null; exit" EXIT INT TERM
    
    # 等待服务器启动
    if wait_for_server; then
        test_all_cron_jobs
    else
        echo "❌ 无法启动开发服务器"
        kill $DEV_PID 2>/dev/null
        exit 1
    fi
    
    echo ""
    echo "🔍 开发服务器仍在运行 (PID: $DEV_PID)"
    echo "按 Ctrl+C 停止服务器并退出"
    wait $DEV_PID
}

# 测试所有 cron jobs
test_all_cron_jobs() {
    echo "🧪 测试所有 Cron Jobs..."
    
    # 测试每5分钟同步
    test_cron_job "*/5 * * * *" "频繁池同步 (每5分钟)"
    
    # 测试每小时统计
    test_cron_job "0 * * * *" "每小时统计同步"
    
    # 测试每周清理
    test_cron_job "0 2 * * 0" "每周数据清理 (周日凌晨2点)"
    
    # 测试未知模式
    test_cron_job "unknown pattern" "未知模式 (应该产生警告)"
    
    echo ""
    echo "📊 Cron Jobs 测试完成"
}

# 测试特定 cron job
test_specific_cron() {
    echo "请输入 Cron 表达式 (例如: */5 * * * *):"
    read -r cron_pattern
    
    echo "请输入描述:"
    read -r description
    
    test_cron_job "$cron_pattern" "$description"
}

# 查看 cron 配置
show_cron_config() {
    echo "📋 当前 Cron Job 配置:"
    echo ""
    
    if [[ -f "wrangler.toml" ]]; then
        echo "从 wrangler.toml:"
        echo ""
        # 查找 cron 相关配置
        if grep -A 15 "triggers.crons" wrangler.toml; then
            echo ""
        elif grep -A 10 "Scheduled jobs" wrangler.toml; then
            echo ""
        else
            echo "❌ 未找到 cron triggers 配置"
            echo ""
            echo "示例配置格式:"
            echo "[[triggers.crons]]"
            echo "name = \"sync-pools-frequent\""
            echo "cron = \"*/5 * * * *\""
        fi
    else
        echo "❌ 未找到 wrangler.toml 文件"
    fi
    
    echo ""
    echo "📖 Cron 表达式说明:"
    echo "*/5 * * * *  - 每5分钟"
    echo "0 * * * *    - 每小时整点"
    echo "0 2 * * 0    - 每周日凌晨2点"
    echo "0 0 * * *    - 每天午夜"
    echo "0 0 1 * *    - 每月1号午夜"
}

# 生产环境测试
test_production() {
    echo "🌐 生产环境 Cron Job 测试"
    echo "注意: 这将触发真实的 Cron Job 执行"
    echo ""
    
    echo "请输入 Worker 名称 (默认: $WORKER_NAME):"
    read -r input_name
    if [[ -n "$input_name" ]]; then
        WORKER_NAME="$input_name"
    fi
    
    echo "确认触发生产环境 Cron Job? (y/N)"
    read -r confirm
    
    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        echo "🚀 触发生产环境 Cron Job..."
        wrangler cron trigger "$WORKER_NAME"
    else
        echo "❌ 已取消"
    fi
}

# 查看实时日志
show_logs() {
    echo "📋 查看实时日志 (按 Ctrl+C 停止)..."
    wrangler tail "$WORKER_NAME" --format=pretty
}

# 主循环
while true; do
    show_menu
    echo -n "请选择 (0-7): "
    read -r choice
    
    case $choice in
        1)
            run_unit_tests
            ;;
        2)
            start_dev_and_test
            ;;
        3)
            if curl -s "$LOCAL_URL/health" >/dev/null 2>&1; then
                test_all_cron_jobs
            else
                echo "❌ 本地服务器未运行"
                echo "请先运行: wrangler dev --local"
            fi
            ;;
        4)
            test_specific_cron
            ;;
        5)
            show_cron_config
            ;;
        6)
            test_production
            ;;
        7)
            show_logs
            ;;
        0)
            echo "👋 再见!"
            exit 0
            ;;
        *)
            echo "❌ 无效选择，请输入 0-7"
            ;;
    esac
    
    echo ""
    echo "按 Enter 继续..."
    read -r
done
