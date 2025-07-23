# BSC 测试网 Indexer SQL 查询手册

## 连接数据库

```bash
docker exec -it postgres psql -U graph-node -d graph-node
```

## 重要说明

### block_range 字段 (int4range 类型)

Graph Protocol 使用 PostgreSQL 的 `int4range` 类型来跟踪实体的生命周期：

#### 数据类型范围

- **int4range**: PostgreSQL 范围类型，基于 32位有符号整数 (int4)
- **范围**: -2,147,483,648 到 2,147,483,647
- **表示法**: `[start, end)` (左闭右开区间)

#### 字段含义

- `lower(block_range)`: 实体被创建的区块号
- `upper(block_range)`: 实体被删除/更新的区块号
  - 如果为 `NULL`，表示范围是无限的 (`upper_inf(block_range) = true`)
  - Graph Protocol 使用 `2147483647` 作为无限范围的替代值
- **2147483647** = 2³¹-1 (32位有符号整数最大值)，表示"永远有效"

#### 实际使用示例

```sql
-- 历史记录: [54522931, 54979683)  - 已结束
-- 历史记录: [54979683, 55076159)  - 已结束  
-- 当前记录: [55076159, )         - 无限范围，仍然有效
```

#### 查询模式

```sql
-- 查询当前有效记录
WHERE COALESCE(upper(block_range), 2147483647) = 2147483647

-- 检查是否为无限范围
WHERE upper_inf(block_range) = true

-- 查询指定区块的有效记录
WHERE block_range @> 55000000::integer
```

## 基础查询

### 1. 查看工厂信息

```sql
SELECT * FROM sgd1.lb_factory;
```

### 2. 查看所有交易对

```sql
SELECT 
    id as pair_address,
    name as pair_name,
    token_x,
    token_y,
    "timestamp",
    block
FROM sgd1.lb_pair;
```

### 3. 查看代币信息

```sql
SELECT DISTINCT
    id as token_address,
    symbol,
    name,
    decimals
FROM sgd1.token
ORDER BY symbol;
```

### 4. 查看流动性池 (Bins)

```sql
SELECT 
    id,
    lb_pair as pair_address,
    bin_id,
    total_supply,
    reserve_x::float / 1e18 as reserve_x_formatted,
    reserve_y::float / 1e18 as reserve_y_formatted
FROM sgd1.bin
WHERE total_supply > 0
ORDER BY bin_id
LIMIT 10;
```

### 5. 查看交易活动 (Traces)

```sql
SELECT 
    id,
    type as transaction_type,
    lb_pair as pair_address,
    bin_id,
    amount_x_in::float / 1e18 as amount_x_in_formatted,
    amount_x_out::float / 1e18 as amount_x_out_formatted,
    amount_y_in::float / 1e18 as amount_y_in_formatted,
    amount_y_out::float / 1e18 as amount_y_out_formatted
FROM sgd1.trace
ORDER BY vid DESC
LIMIT 10;
```

## 高级查询

### 6. 交易对的流动性分布

```sql
SELECT 
    p.name as pair_name,
    COUNT(b.id) as bin_count,
    SUM(b.total_supply::float) / 1e18 as total_liquidity,
    AVG(b.reserve_x::float) / 1e18 as avg_reserve_x,
    AVG(b.reserve_y::float) / 1e18 as avg_reserve_y
FROM sgd1.lb_pair p
LEFT JOIN sgd1.bin b ON p.id = b.lb_pair
WHERE b.total_supply > 0
GROUP BY p.id, p.name;
```

### 7. 代币交易统计

```sql
SELECT 
    t.symbol,
    t.name,
    COUNT(tr.id) as transaction_count,
    SUM(CASE WHEN tr.type = 'swap' THEN 1 ELSE 0 END) as swap_count,
    SUM(CASE WHEN tr.type = 'mint' THEN 1 ELSE 0 END) as mint_count,
    SUM(CASE WHEN tr.type = 'burn' THEN 1 ELSE 0 END) as burn_count
FROM sgd1.token t
LEFT JOIN sgd1.lb_pair p ON (p.token_x = t.id OR p.token_y = t.id)
LEFT JOIN sgd1.trace tr ON tr.lb_pair = p.id
GROUP BY t.id, t.symbol, t.name
ORDER BY transaction_count DESC;
```

### 8. 最活跃的价格区间 (Bins)

```sql
SELECT 
    b.bin_id,
    b.lb_pair as pair_address,
    p.name as pair_name,
    COUNT(tr.id) as transaction_count,
    b.total_supply::float / 1e18 as liquidity,
    b.reserve_x::float / 1e18 as reserve_x,
    b.reserve_y::float / 1e18 as reserve_y
FROM sgd1.bin b
LEFT JOIN sgd1.lb_pair p ON p.id = b.lb_pair
LEFT JOIN sgd1.trace tr ON tr.lb_pair = b.lb_pair AND tr.bin_id = b.bin_id
GROUP BY b.id, b.bin_id, b.lb_pair, p.name, b.total_supply, b.reserve_x, b.reserve_y
ORDER BY transaction_count DESC, liquidity DESC
LIMIT 10;
```

### 9. 实时数据统计

```sql
SELECT 
    'LBFactory' as entity,
    COUNT(*) as count
FROM sgd1.lb_factory
UNION ALL
SELECT 
    'LBPair' as entity,
    COUNT(*) as count
FROM sgd1.lb_pair
UNION ALL
SELECT 
    'Token' as entity,
    COUNT(DISTINCT id) as count
FROM sgd1.token
UNION ALL
SELECT 
    'Bin' as entity,
    COUNT(*) as count
FROM sgd1.bin
UNION ALL
SELECT 
    'Trace' as entity,
    COUNT(*) as count
FROM sgd1.trace;
```

### 10. 查看同步状态

```sql
-- 查看最新处理的区块
SELECT 
    MAX(COALESCE(upper(block_range) - 1, 2147483647)) as latest_block
FROM sgd1.lb_pair;

-- 查看数据覆盖的区块范围
SELECT 
    MIN(lower(block_range)) as start_block,
    MAX(COALESCE(upper(block_range) - 1, 2147483647)) as latest_block
FROM sgd1.lb_pair;
```

## GraphQL 查询示例

访问 <http://localhost:8000/subgraphs/name/entysquare/bsc-local/graphql>

### 基础 GraphQL 查询

```graphql
# 查询工厂信息
{
  lbFactories {
    id
    pairCount
    tokenCount
  }
}

# 查询交易对
{
  lbPairs {
    id
    name
    tokenX {
      id
      symbol
      name
    }
    tokenY {
      id
      symbol
      name
    }
  }
}

# 查询流动性 bins
{
  bins(first: 10, where: {totalSupply_gt: "0"}) {
    id
    binId
    totalSupply
    reserveX
    reserveY
    lbPair {
      name
    }
  }
}

# 查询交易记录
{
  traces(first: 10, orderBy: id, orderDirection: desc) {
    id
    type
    lbPair
    binId
    amountXIn
    amountXOut
    amountYIn
    amountYOut
  }
}
```
