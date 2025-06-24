#!/bin/bash

# Database setup and initialization script for Entysquare DEX

echo "🚀 Setting up Entysquare DEX Database..."

# Create D1 database (if not exists)
echo "📦 Creating D1 database..."
npx wrangler d1 create d1-dex-database || echo "Database may already exist"

# Run migrations
echo "🔧 Running database migrations..."
npx wrangler d1 migrations apply d1-dex-database --local

# Add initial token data
echo "💰 Adding initial token data..."

# Common BSC tokens
npx wrangler d1 execute d1-dex-database --local --command "
INSERT OR IGNORE INTO tokens (id, address, chain, name, symbol, decimals, logo_uri, created_at) VALUES 
('token_wbnb_bsc', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', 'binance', 'Wrapped BNB', 'WBNB', 18, 'https://tokens.pancakeswap.finance/images/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c.png', $(date +%s)000),
('token_usdt_bsc', '0x55d398326f99059ff775485246999027b3197955', 'binance', 'Tether USD', 'USDT', 18, 'https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png', $(date +%s)000),
('token_usdc_bsc', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'binance', 'USD Coin', 'USDC', 18, 'https://tokens.pancakeswap.finance/images/0x8AC76a51cc950d9822D68b83fE1Ad97B32CD580d.png', $(date +%s)000),
('token_busd_bsc', '0xe9e7cea3dedca5984780bafc599bd69add087d56', 'binance', 'BUSD Token', 'BUSD', 18, 'https://tokens.pancakeswap.finance/images/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56.png', $(date +%s)000),
('token_cake_bsc', '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', 'binance', 'PancakeSwap Token', 'CAKE', 18, 'https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png', $(date +%s)000),
('token_eth_bsc', '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 'binance', 'Ethereum Token', 'ETH', 18, 'https://tokens.pancakeswap.finance/images/0x2170Ed0880ac9A755fd29B2688956BD959F933F8.png', $(date +%s)000),
('token_btcb_bsc', '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', 'binance', 'BTCB Token', 'BTCB', 18, 'https://tokens.pancakeswap.finance/images/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c.png', $(date +%s)000);
"

# BSC Testnet tokens
npx wrangler d1 execute d1-dex-database --local --command "
INSERT OR IGNORE INTO tokens (id, address, chain, name, symbol, decimals, logo_uri, created_at) VALUES 
('token_wbnb_bsctest', '0xae13d989dac2f0debff460ac112a837c89baa7cd', 'bsctest', 'Wrapped BNB (Testnet)', 'WBNB', 18, 'https://tokens.pancakeswap.finance/images/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c.png', $(date +%s)000),
('token_usdt_bsctest', '0x377533d0e68a22cf180205e9c9ed980f74bc5050', 'bsctest', 'Tether USD (Testnet)', 'USDT', 18, 'https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png', $(date +%s)000),
('token_usdc_bsctest', '0x64544969ed7ebf5f083679233325356ebe738930', 'bsctest', 'USD Coin (Testnet)', 'USDC', 18, 'https://tokens.pancakeswap.finance/images/0x8AC76a51cc950d9822D68b83fE1Ad97B32CD580d.png', $(date +%s)000),
('token_cake_bsctest', '0xfa60d973f7642b748046464e165a65b7323b0dee', 'bsctest', 'PancakeSwap Token (Testnet)', 'CAKE', 18, 'https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png', $(date +%s)000);
"

# Add example pools (these would be discovered from factory events in production)
echo "🏊 Adding example pools..."

npx wrangler d1 execute d1-dex-database --local --command "
INSERT OR IGNORE INTO pools (id, address, chain, token_x, token_y, bin_step, name, status, version, created_at, updated_at) VALUES 
('pool_wbnb_usdt', '0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c', 'binance', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', '0x55d398326f99059ff775485246999027b3197955', 15, 'WBNB/USDT', 'active', 'v2.2', $(date +%s)000, $(date +%s)000),
('pool_usdc_usdt', '0x2f8a1b6b879c45b5f7d7d2a6c1e8e4f3b9c5d8e7', 'binance', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', '0x55d398326f99059ff775485246999027b3197955', 5, 'USDC/USDT', 'active', 'v2.2', $(date +%s)000, $(date +%s)000),
('pool_eth_wbnb', '0x3f9a2c7c891d8e6f2b5e4d3c8e7f6a9b2c5d8e1f', 'binance', '0x2170ed0880ac9a755fd29b2688956bd959f933f8', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', 25, 'ETH/WBNB', 'active', 'v2.2', $(date +%s)000, $(date +%s)000),
('pool_cake_wbnb', '0x4f0a3d8f9c2e7b5a6d9e2c8f7b5a3d9e2c8f7b5a', 'binance', '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', 25, 'CAKE/WBNB', 'active', 'v2.2', $(date +%s)000, $(date +%s)000);
"

# BSC Testnet pools
npx wrangler d1 execute d1-dex-database --local --command "
INSERT OR IGNORE INTO pools (id, address, chain, token_x, token_y, bin_step, name, status, version, created_at, updated_at) VALUES 
('pool_wbnb_usdt_test', '0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c', 'bsctest', '0xae13d989dac2f0debff460ac112a837c89baa7cd', '0x377533d0e68a22cf180205e9c9ed980f74bc5050', 15, 'WBNB/USDT (Testnet)', 'active', 'v2.2', $(date +%s)000, $(date +%s)000),
('pool_usdc_usdt_test', '0x2f8a1b6b879c45b5f7d7d2a6c1e8e4f3b9c5d8e7', 'bsctest', '0x64544969ed7ebf5f083679233325356ebe738930', '0x377533d0e68a22cf180205e9c9ed980f74bc5050', 5, 'USDC/USDT (Testnet)', 'active', 'v2.2', $(date +%s)000, $(date +%s)000);
"

echo "✅ Database setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Test the API endpoints: curl -H \"x-api-key: test-key\" \"http://localhost:8787/v1/pools/binance\""
echo "3. Add more pools using the admin API: POST /v1/admin/pools"
echo "4. Monitor sync status: GET /v1/admin/sync/status"
echo ""
echo "📋 Available API endpoints:"
echo "- GET /v1/dex/analytics/{chain}"
echo "- GET /v1/pools/{chain}"
echo "- GET /v1/pools/{chain}/{address}"
echo "- GET /v1/user/bin-ids/{user}/{chain}/{pool}"
echo "- GET /v1/user/pool-ids/{user}/{chain}"
echo "- GET /v1/user/swap-history/{user}/{chain}"
echo "- GET /v1/user/liquidity-history/{user}/{chain}"
echo "- GET /v1/user/statistics/{user}/{chain}"
echo "- POST /v1/admin/sync/pool/{chain}/{address}"
echo "- POST /v1/admin/pools"
echo "- POST /v1/admin/tokens"
echo ""
echo "🔧 Admin commands:"
echo "- Add pool: curl -X POST -H \"x-api-key: test-key\" -H \"Content-Type: application/json\" -d '{\"address\":\"0x...\",\"chain\":\"binance\",\"tokenX\":\"0x...\",\"tokenY\":\"0x...\",\"binStep\":15,\"name\":\"TOKEN1/TOKEN2\"}' \"http://localhost:8787/v1/admin/pools\""
echo "- Sync pool: curl -X POST -H \"x-api-key: test-key\" \"http://localhost:8787/v1/admin/sync/pool/binance/0x...\""
