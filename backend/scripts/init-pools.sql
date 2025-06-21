-- 初始化流动性池数据
-- 添加一些 BSC 链上活跃的 DEX 流动性池

INSERT OR IGNORE INTO pools (id, address, chain, token_x, token_y, bin_step, name, status, version) VALUES 
-- PancakeSwap V3 主要池（作为参考，可以监控交易活动）
('pool_bnb_usdt_1', '0x36696169c63e42cd08ce11f5deebbcebae652050', 'bsc', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '0x55d398326f99059fF775485246999027B3197955', 25, 'WBNB/USDT', 'active', 'v2.2'),
('pool_bnb_usdc_1', '0x133b3d95bad5405d14d53473671200e9342896bf', 'bsc', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 25, 'WBNB/USDC', 'active', 'v2.2'),
('pool_btc_bnb_1', '0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4', 'bsc', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 25, 'BTCB/WBNB', 'active', 'v2.2'),
('pool_eth_bnb_1', '0x85faac652b707fdf6b1387afc6262b36c250927c', 'bsc', '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 25, 'ETH/WBNB', 'active', 'v2.2'),
('pool_cake_bnb_1', '0x7bb89460599dbf32ee3aa50798bbceae2a5f7f6a', 'bsc', '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 25, 'CAKE/WBNB', 'active', 'v2.2');

-- 添加对应的代币信息
INSERT OR IGNORE INTO tokens (id, address, chain, name, symbol, decimals, logo_uri) VALUES 
-- BSC 主流代币
('wbnb_bsc', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 'bsc', 'Wrapped BNB', 'WBNB', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png'),
('usdt_bsc', '0x55d398326f99059fF775485246999027B3197955', 'bsc', 'Tether USD', 'USDT', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png'),
('usdc_bsc', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 'bsc', 'USD Coin', 'USDC', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png'),
('btcb_bsc', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', 'bsc', 'BTCB Token', 'BTCB', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/14108.png'),
('eth_bsc', '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', 'bsc', 'Ethereum Token', 'ETH', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png'),
('cake_bsc', '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 'bsc', 'PancakeSwap Token', 'CAKE', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/7186.png');

-- 添加测试网代币
INSERT OR IGNORE INTO tokens (id, address, chain, name, symbol, decimals, logo_uri) VALUES 
('wbnb_testnet', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', 'bsc-testnet', 'Wrapped BNB (Testnet)', 'WBNB', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png'),
('usdt_testnet', '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', 'bsc-testnet', 'USDT (Testnet)', 'USDT', 18, 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png');

-- 添加一个测试网池
INSERT OR IGNORE INTO pools (id, address, chain, token_x, token_y, bin_step, name, status, version) VALUES 
('pool_bnb_usdt_test', '0x1234567890123456789012345678901234567890', 'bsc-testnet', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', 25, 'WBNB/USDT (Testnet)', 'active', 'v2.2');

-- 初始化池统计数据（模拟数据）
INSERT OR IGNORE INTO pool_stats (
    id, 
    pool_address, 
    chain, 
    reserve_x, 
    reserve_y, 
    active_bin_id, 
    total_supply, 
    liquidity_usd, 
    volume_24h, 
    volume_7d, 
    fees_24h, 
    apy, 
    block_number, 
    timestamp
) VALUES 
('stats_bnb_usdt_1', '0x36696169c63e42cd08ce11f5deebbcebae652050', 'bsc', '1000000000000000000000', '300000000000000000000000', 8388608, '1000000000000000000000', 150000.00, 50000.00, 350000.00, 1500.00, 15.5, 35000000, strftime('%s', 'now') * 1000),
('stats_bnb_usdc_1', '0x133b3d95bad5405d14d53473671200e9342896bf', 'bsc', '800000000000000000000', '240000000000000000000000', 8388608, '800000000000000000000', 120000.00, 40000.00, 280000.00, 1200.00, 12.8, 35000001, strftime('%s', 'now') * 1000),
('stats_btc_bnb_1', '0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4', 'bsc', '50000000000000000', '500000000000000000000', 8388608, '500000000000000000000', 80000.00, 25000.00, 175000.00, 750.00, 18.2, 35000002, strftime('%s', 'now') * 1000);

-- 打印初始化完成信息
SELECT 'Database initialization completed successfully' as status;
SELECT 'Pools added: ' || COUNT(*) as pools_count FROM pools;
SELECT 'Tokens added: ' || COUNT(*) as tokens_count FROM tokens;
SELECT 'Pool stats added: ' || COUNT(*) as stats_count FROM pool_stats;
