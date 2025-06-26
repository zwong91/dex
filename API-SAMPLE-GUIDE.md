
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
