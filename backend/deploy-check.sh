#!/bin/bash

# DEX Backend Deployment Script
# 检查部署准备情况并提供部署指南

echo "🚀 DEX Backend Deployment Checker"
echo "=================================="

# 检查配置文件
echo "📋 Checking configuration files..."

if [ -f "wrangler.toml" ]; then
    echo "✅ wrangler.toml exists"
    
    # 检查是否还有占位符
    if grep -q "YOUR_ACCOUNT_ID_HERE" wrangler.toml; then
        echo "⚠️  Account ID needs to be set in wrangler.toml"
        echo "   Run: npx wrangler whoami to get your account ID"
    else
        echo "✅ Account ID is configured"
    fi
    
    if grep -q "YOUR_NEW_DEX_DATABASE_ID_HERE" wrangler.toml; then
        echo "⚠️  Database ID needs to be set in wrangler.toml"
        echo "   Run: npx wrangler d1 create d1-dex-database"
    else
        echo "✅ Database ID is configured"
    fi
else
    echo "❌ wrangler.toml not found"
    exit 1
fi

# 检查认证状态
echo ""
echo "🔐 Checking authentication..."
if npx wrangler whoami &>/dev/null; then
    echo "✅ Logged in to Cloudflare"
    npx wrangler whoami
else
    echo "❌ Not logged in to Cloudflare"
    echo "   Run: npx wrangler login"
fi

# 检查TypeScript编译
echo ""
echo "🔧 Checking TypeScript compilation..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# 检查必要的依赖
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed"
    echo "   Run: npm install"
    exit 1
fi

# 生成部署指南
echo ""
echo "📚 Deployment Guide"
echo "===================="
echo ""
echo "1. Login to Cloudflare (if not already):"
echo "   npx wrangler login"
echo ""
echo "2. Create D1 database:"
echo "   npx wrangler d1 create d1-dex-database"
echo ""
echo "3. Update wrangler.toml with your account ID and database ID"
echo ""
echo "4. Deploy to Cloudflare Workers:"
echo "   npm run deploy"
echo ""
echo "5. Run database migrations:"
echo "   npm run migrate:prod"
echo ""
echo "6. Test the deployed API:"
echo "   curl https://your-worker.your-subdomain.workers.dev/health"
echo ""

# 检查本地开发服务器状态
echo "🖥️  Local Development Server"
echo "============================"
if curl -s http://localhost:45975/health &>/dev/null; then
    echo "✅ Local server is running on http://localhost:45975"
    echo "   API Status: $(curl -s http://localhost:45975/health | jq -r '.status' 2>/dev/null || echo 'ok')"
else
    echo "❌ Local server is not running"
    echo "   Start with: npm run dev"
fi

echo ""
echo "🎯 Project Status Summary"
echo "========================"
echo "- Configuration: Ready (needs account setup)"
echo "- Code: Compiled successfully"
echo "- Dependencies: Installed"
echo "- Local Testing: $(curl -s http://localhost:45975/health &>/dev/null && echo 'Passed' || echo 'Needs local server')"
echo ""
echo "Ready for deployment after Cloudflare account setup! 🚀"
