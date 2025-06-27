下面是 routes.ts 里各 AI 路由的 curl 示例。请根据实际部署地址和 API Key 替换相关内容。

---

### 1. 健康检查

```bash
curl -X GET "http://localhost:8787/v1/api/ai/health" | jq
```

---

### 2. AI 聊天补全

```bash
curl -X POST "http://localhost:8787/v1/api/ai/chat" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "prompt": "Explain what is DeFi.",
    "context": "You are a helpful assistant for DeFi and blockchain applications.",
    "temperature": 0.7,
    "maxTokens": 500,
    "stream": true
  }'
```

---

### 3. 代码分析

```bash
curl -X POST "http://localhost:8787/v1/api/ai/analyze-code" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "code": "function add(a, b) { return a + b; }",
    "language": "typescript",
    "analysisType": "security",
    "stream": true
  }'
```

---

### 4. 智能合约分析

```bash
curl -X POST "http://localhost:8787/v1/api/ai/analyze-contract" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "contractCode": "contract Test { function foo() public {} }",
    "contractType": "ERC20",
    "stream": true
  }'
```

---

### 5. DeFi 策略建议

```bash
curl -X POST "http://localhost:8787/v1/api/ai/suggest-strategy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "userProfile": {
      "riskTolerance": "medium",
      "investmentAmount": 1000,
      "timeHorizon": "long",
      "preferredAssets": ["ETH", "USDT"]
    },
    "marketConditions": {
      "volatility": "medium",
      "trend": "bullish"
    },
    "stream": true
  }'
```

---

**说明：**
- `your-domain.com` 替换为你的实际部署域名或本地地址。
- `x-api-key` 头部为你的 API Key（如有需要）。
- 所有 POST 路由都需 `Content-Type: application/json`。
- 参数可根据实际需求调整。
