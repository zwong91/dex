#!/bin/bash

# 快速测试 Cron Jobs 的示例脚本
# 这个脚本演示如何快速验证 scheduled 函数的基本功能

echo "🚀 快速测试 Cron Jobs"
echo "==================="

# 1. 运行单元测试
echo "📋 1. 运行单元测试..."
npx vitest run test/scheduled-simple.spec.ts --reporter=verbose

echo ""
echo "✅ 单元测试完成"
echo ""

# 2. 检查 Cron 配置
echo "📋 2. 当前 Cron Job 配置:"
echo ""
grep -A 20 "Scheduled jobs" wrangler.toml || echo "❌ 未找到 Cron 配置"

echo ""
echo "📋 3. 可用的测试命令:"
echo ""
echo "手动测试 (需要先运行 'wrangler dev --local'):"
echo '• 每5分钟同步: curl -X POST "http://localhost:8787/__scheduled?cron=%2A%2F5%20%2A%20%2A%20%2A%20%2A"'
echo '• 每小时统计: curl -X POST "http://localhost:8787/__scheduled?cron=0%20%2A%20%2A%20%2A%20%2A"'
echo '• 每周清理: curl -X POST "http://localhost:8787/__scheduled?cron=0%202%20%2A%20%2A%200"'

echo ""
echo "部署测试:"
echo "• wrangler cron trigger <worker-name>"
echo "• wrangler tail <worker-name>"

echo ""
echo "📚 详细测试指南请查看: CRON_TESTING_GUIDE.md"
echo "🔧 交互式测试请运行: ./test-cron-jobs.sh"
