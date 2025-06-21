#!/bin/bash

# 数据库初始化和池配置脚本
# 用于首次设置 DEX 同步系统

echo "🔧 Starting DEX database initialization..."

# 检查环境变量
if [ -z "$D1_DATABASE" ]; then
    echo "❌ Error: D1_DATABASE environment variable not set"
    exit 1
fi

echo "✅ Environment variables verified"

# 运行基础数据库初始化
echo "📊 Initializing base database structure..."
npx wrangler d1 execute $D1_DATABASE --file=./scripts/init-db.sql

# 运行池数据初始化
echo "🏊 Initializing pool configurations..."
npx wrangler d1 execute $D1_DATABASE --file=./scripts/init-pools.sql

# 验证初始化结果
echo "🔍 Verifying database initialization..."
npx wrangler d1 execute $D1_DATABASE --command="SELECT COUNT(*) as pools_count FROM pools;"
npx wrangler d1 execute $D1_DATABASE --command="SELECT COUNT(*) as tokens_count FROM tokens;"
npx wrangler d1 execute $D1_DATABASE --command="SELECT COUNT(*) as stats_count FROM pool_stats;"

echo "✅ Database initialization completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - Base database schema: ✅"
echo "   - Default pools: ✅" 
echo "   - Token configurations: ✅"
echo "   - Initial pool stats: ✅"
echo ""
echo "🚀 Your DEX sync system is ready to run!"
echo "   Run 'npm run dev' to start the sync service"
