-- Initialize database with basic permissions and sample data

-- Insert permission types
INSERT OR IGNORE INTO permissions (id, name, description, category, tier) VALUES 
('pools_read', 'pools_read', 'Read access to pool data', 'pools', 'free'),
('pools_create', 'pools_create', 'Create new pools', 'pools', 'basic'),
('swaps_read', 'swaps_read', 'Read access to swap data', 'swaps', 'free'),
('swaps_write', 'swaps_write', 'Execute swaps', 'swaps', 'basic'),
('liquidity_read', 'liquidity_read', 'Read liquidity data', 'liquidity', 'free'),
('liquidity_write', 'liquidity_write', 'Add/remove liquidity', 'liquidity', 'basic'),
('portfolio_read', 'portfolio_read', 'Read portfolio data', 'portfolio', 'basic'),
('portfolio_write', 'portfolio_write', 'Modify portfolio', 'portfolio', 'pro'),
('analytics_basic', 'analytics_basic', 'Basic analytics', 'analytics', 'basic'),
('analytics_advanced', 'analytics_advanced', 'Advanced analytics', 'analytics', 'pro'),
('price_history', 'price_history', 'Price history data', 'analytics', 'basic'),
('admin_users', 'admin_users', 'User management', 'admin', 'enterprise'),
('admin_api', 'admin_api', 'API management', 'admin', 'enterprise'),
('admin_system', 'admin_system', 'System administration', 'admin', 'enterprise');

-- Insert sample tokens
INSERT OR IGNORE INTO tokens (id, address, symbol, name, decimals, chain) VALUES 
('avax', '0x0000000000000000000000000000000000000000', 'AVAX', 'Avalanche', 18, 'avalanche'),
('wavax', '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 'WAVAX', 'Wrapped AVAX', 18, 'avalanche'),
('joe', '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', 'JOE', 'Joe Token', 18, 'avalanche'),
('wbtc', '0x50b7545627a5162F82A992c33b87aDc75187B218', 'WBTC', 'Wrapped BTC', 8, 'avalanche'),
('usdc', '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', 'USDC.e', 'USD Coin', 6, 'avalanche'),
('usdt', '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', 'USDT.e', 'Tether USD', 6, 'avalanche');

-- Create admin user
INSERT OR IGNORE INTO users (id, email, username, name, status) VALUES 
('admin-001', 'admin@entysquare.com', 'admin', 'System Administrator', 'active');

-- Create admin API key
INSERT OR IGNORE INTO api_keys (
    id, 
    user_id, 
    name, 
    key_hash, 
    key_prefix,
    permissions, 
    tier,
    status,
    rate_limit_per_hour, 
    rate_limit_per_day
) VALUES (
    'admin-key-001',
    'admin-001',
    'Admin Master Key',
    'sha256-admin-demo-key-hash', -- In production, use proper hash
    'entysquare_admin_',
    '["pools_read","pools_create","swaps_read","swaps_write","liquidity_read","liquidity_write","portfolio_read","portfolio_write","analytics_basic","analytics_advanced","price_history","admin_users","admin_api","admin_system"]',
    'enterprise',
    'active',
    10000,
    100000
);

-- Create test user
INSERT OR IGNORE INTO users (id, email, username, name, status) VALUES 
('test-user-001', 'test@example.com', 'testuser', 'Test User', 'active');

-- Create test API key with basic permissions
INSERT OR IGNORE INTO api_keys (
    id, 
    user_id, 
    name, 
    key_hash, 
    key_prefix,
    permissions, 
    tier,
    status,
    rate_limit_per_hour, 
    rate_limit_per_day
) VALUES (
    'test-key-001',
    'test-user-001',
    'Test Basic Key',
    'sha256-test-demo-key-hash',
    'entysquare_test_',
    '["pools_read","swaps_read","liquidity_read","analytics_basic","price_history"]',
    'basic',
    'active',
    1000,
    10000
);

-- Initialize sync status for popular pairs
INSERT OR IGNORE INTO sync_status (id, chain, contract_address, event_type, last_block_number, last_log_index) VALUES 
('sync_avalanche_pools', 'avalanche', '0x0000000000000000000000000000000000000000', 'PairCreated', 0, 0),
('sync_avalanche_swaps', 'avalanche', '0x0000000000000000000000000000000000000000', 'Swap', 0, 0),
('sync_avalanche_liquidity', 'avalanche', '0x0000000000000000000000000000000000000000', 'LiquidityAdded', 0, 0);
