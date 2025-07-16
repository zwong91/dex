#### 1. 获取每日交易所分析数据

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/analytics/bsc?startTime=1672531200&endTime=1704067200&version=all" \
  -H "x-api-key: test-key" | jq
```

---

#### 2. 按链获取池列表

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/pools/bsc?pageSize=10&pageNum=1&orderBy=volume" \
  -H "x-api-key: test-key" | jq
```

---

#### 3. 获取指定池详情

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/pools/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: test-key" | jq
```

---

**说明：**

- 所有请求都需要在 header 里加上 `x-api-key: test-key`。
- 可根据实际需要添加查询参数（如分页、排序、过滤等）。
- `bsc` 可替换为 `ethereum` 等其他链名。

---

#### 4. 获取用户 Bin IDs

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/user/bin-ids/0xE0A051f87bb78f38172F633449121475a193fC1A/bsc/0xa871c952b96ad832ef4b12f1b96b5244a4106090" \
  -H "x-api-key: test-key" | jq
```

---

#### 5. 获取用户池 IDs

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/user/pool-ids/0xE0A051f87bb78f38172F633449121475a193fC1A/bsc?pageSize=20&pageNum=1" \
  -H "x-api-key: test-key" | jq
```

---

#### 6. 池用户余额查询

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/user/pool-user-balances?chainId=97&lpAddress=0xE0A051f87bb78f38172F633449121475a193fC1A&poolAddress=0x406ca3b0acd27b8060c84902d2b0cab6f5ad898d" \
  -H "x-api-key: test-key" | jq
```

---

#### 7. 获取用户费用收益

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/user/fees-earned/bsc/0xE0A051f87bb78f38172F633449121475a193fC1A/0x406ca3b0acd27b8060c84902d2b0cab6f5ad898d" \
  -H "x-api-key: test-key" | jq
```

---

#### 8. 获取指定池的 Bins 数据

```bash
# 获取池子的所有 bins（前100个）
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/pools/bsc/0x904ede072667c4bc3d7e6919b4a0a442559295c8/bins" \
  -H "x-api-key: test-key" | jq

# 获取指定 active ID 周围的 bins（range=20，即 active ID ±20）
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/pools/bsc/0x904ede072667c4bc3d7e6919b4a0a442559295c8/bins?activeId=8391210&range=20&limit=50" \
  -H "x-api-key: test-key" | jq

# 只获取当前 active bin
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/pools/bsc/0x904ede072667c4bc3d7e6919b4a0a442559295c8/bins?range=0&limit=1" \
  -H "x-api-key: test-key" | jq
```

**参数说明：**

- `activeId`（可选）：指定中心 bin ID，如果不提供则使用池子当前的 active ID
- `range`（可选，默认50）：获取指定 ID 前后多少个 bins，范围 0-200（range=0 表示只获取当前 active bin）
- `limit`（可选，默认100）：最大返回 bins 数量，范围 1-1000

**返回数据包含：**

- 池子基本信息（名称、active ID、bin step、代币信息）
- bins 数组，每个 bin 包含：
  - `binId`：bin 的 ID
  - `isActive`：是否为当前 active bin
  - `priceX` / `priceY`：bin 的价格
  - `reserveX` / `reserveY`：bin 中的流动性
  - `liquidityUsd`：以 USD 计价的流动性
  - `liquidityProviderCount`：流动性提供者数量

---
