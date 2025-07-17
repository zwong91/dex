#!/bin/bash

# Cloudflare KV Setup Script for DEX Backend
# This script helps you set up KV namespaces for caching

echo "🚀 Setting up Cloudflare KV for DEX Backend Caching"
echo "=================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI found and logged in"

# Create KV namespaces
echo ""
echo "📦 Creating KV namespaces..."

# Production namespace
echo "Creating production KV namespace..."
PROD_OUTPUT=$(wrangler kv namespace create "DEX_CACHE" 2>&1)
PROD_KV_ID=$(echo "$PROD_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -n "$PROD_KV_ID" ]; then
    echo "✅ Production KV namespace created: $PROD_KV_ID"
else
    echo "❌ Failed to create production KV namespace"
    echo "$PROD_OUTPUT"
    exit 1
fi

# Preview namespace
echo "Creating preview KV namespace..."
PREVIEW_OUTPUT=$(wrangler kv namespace create "DEX_CACHE" --preview 2>&1)
PREVIEW_KV_ID=$(echo "$PREVIEW_OUTPUT" | grep -o 'preview_id = "[^"]*"' | cut -d'"' -f2)

if [ -n "$PREVIEW_KV_ID" ]; then
    echo "✅ Preview KV namespace created: $PREVIEW_KV_ID"
else
    echo "❌ Failed to create preview KV namespace"
    echo "$PREVIEW_OUTPUT"
    exit 1
fi

# Generate wrangler.toml configuration
echo ""
echo "📝 Generating wrangler.toml configuration..."

cat << EOF

Add the following to your wrangler.toml file:

# KV Namespaces for caching
[[kv_namespaces]]
binding = "KV"
id = "$PROD_KV_ID"
preview_id = "$PREVIEW_KV_ID"

# Environment-specific configurations
[env.production]
kv_namespaces = [
  { binding = "KV", id = "$PROD_KV_ID" }
]

[env.staging]
kv_namespaces = [
  { binding = "KV", id = "$PREVIEW_KV_ID" }
]

EOF

# Test KV namespace
echo "🧪 Testing KV namespace..."

# Write test data
wrangler kv key put --namespace-id="$PROD_KV_ID" "test:setup" "success" > /dev/null 2>&1

# Read test data
TEST_VALUE=$(wrangler kv key get --namespace-id="$PROD_KV_ID" "test:setup" 2>/dev/null)

if [ "$TEST_VALUE" = "success" ]; then
    echo "✅ KV namespace test successful"
    
    # Clean up test data
    wrangler kv key delete --namespace-id="$PROD_KV_ID" "test:setup" > /dev/null 2>&1
else
    echo "❌ KV namespace test failed"
    exit 1
fi

echo ""
echo "🎉 KV setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update your wrangler.toml with the configuration above"
echo "2. Deploy your worker: wrangler deploy"
echo "3. Monitor cache performance in Cloudflare dashboard"
echo ""
echo "Cache endpoints will be available at:"
echo "- /v1/api/cache/status"
echo "- /v1/api/cache/invalidate/*"
echo ""
echo "Happy caching! 🚀"
