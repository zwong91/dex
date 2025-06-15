#!/bin/bash

# DEX Backend Serverless 部署脚本

echo "🚀 开始部署 DEX Backend Serverless..."

# 检查 wrangler 是否已安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler 未安装，请先安装: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录 Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  请先登录 Cloudflare: wrangler login"
    exit 1
fi

# 检查配置文件
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 未找到 wrangler.toml 配置文件"
    exit 1
fi

# 检查环境变量
if grep -q "database_id = \"\"" wrangler.toml; then
    echo "⚠️  请先配置 D1 数据库 ID"
    echo "   运行: wrangler d1 create d1-dex-database"
    echo "   然后将 database_id 填入 wrangler.toml"
fi

if grep -q "bucket_name = ''" wrangler.toml; then
    echo "⚠️  请先配置 R2 存储桶名称"
    echo "   运行: wrangler r2 bucket create dex-storage"
    echo "   然后将 bucket_name 填入 wrangler.toml"
fi

if grep -q "KEY = \"\"" wrangler.toml; then
    echo "⚠️  请先配置认证密钥 KEY"
fi

# 生成数据库迁移（如果需要）
echo "📊 检查数据库迁移..."
if [ ! -d "drizzle" ] || [ -z "$(ls -A drizzle)" ]; then
    echo "🔄 生成数据库迁移..."
    npm run generate
fi

# 执行部署
echo "🚀 开始部署..."
npm run deploy

if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo ""
    echo "📝 下一步："
    echo "1. 运行数据库迁移:"
    echo "   wrangler d1 execute d1-dex-database --file=./drizzle/0000_initial.sql"
    echo ""
    echo "2. 测试 API:"
    echo "   curl https://your-worker.your-subdomain.workers.dev/health"
else
    echo "❌ 部署失败"
    exit 1
fi
