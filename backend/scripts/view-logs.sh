#!/bin/bash

# ==================================================
# Workers Logs Viewer Script
# ==================================================
# This script helps you view Cloudflare Workers logs in real-time
#
# Usage:
#   ./scripts/view-logs.sh                    # View production logs
#   ./scripts/view-logs.sh development        # View development logs
#   ./scripts/view-logs.sh staging           # View staging logs
#
# Requirements:
#   - wrangler CLI installed and authenticated
#   - Proper environment configuration in wrangler.toml
# ==================================================

# Set environment (default to production)
ENV=${1:-production}

echo "🔍 Viewing Workers logs for environment: $ENV"
echo "📊 Press Ctrl+C to stop..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if authenticated
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not authenticated with Cloudflare. Please run:"
    echo "   wrangler login"
    exit 1
fi

# Start tailing logs
case $ENV in
    "development")
        echo "🚀 Viewing development logs..."
        wrangler tail --env development --format pretty
        ;;
    "staging")
        echo "🚀 Viewing staging logs..."
        wrangler tail --env staging --format pretty
        ;;
    "production")
        echo "🚀 Viewing production logs..."
        wrangler tail --env production --format pretty
        ;;
    *)
        echo "❌ Invalid environment: $ENV"
        echo "Valid environments: development, staging, production"
        exit 1
        ;;
esac
