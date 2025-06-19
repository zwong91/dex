# LB Pair Price Hooks

这两个新的 hooks 允许你从 Liquidity Book 获取实时的链上价格数据。

## 功能特性

- ✅ **链上实时价格**：直接从 LB pair 合约获取当前活跃价格
- ✅ **使用 LB SDK**：使用官方 SDK 的 `Bin.getPriceFromId()` 进行精确计算
- ✅ **自动刷新**：当参数变化时自动重新获取价格
- ✅ **错误处理**：完整的错误处理和加载状态
- ✅ **批量获取**：支持同时获取多个交易对的价格

## 使用方法

### 1. 单个交易对价格

```typescript
import { useLBPairPrice } from '../dex/hooks/useLBPairPrice'

function MyComponent() {
  const { currentPrice, loading, error, refetch } = useLBPairPrice(
    '0x123...', // LB pair 合约地址
    25          // bin step (基点，25 = 0.25%)
  )

  if (loading) return <div>Loading price...</div>
  if (error) return <div>Error: {error}</div>
  
  return <div>Current Price: {currentPrice}</div>
}
```

### 2. 多个交易对价格

```typescript
import { useMultipleLBPairPrices } from '../dex/hooks/useLBPairPrice'

function MyComponent() {
  const pairs = [
    { pairAddress: '0x123...', binStep: 25 },
    { pairAddress: '0x456...', binStep: 50 },
    { pairAddress: '0x789...', binStep: 100 },
  ]

  const { prices, loading, error, refetch } = useMultipleLBPairPrices(pairs)

  if (loading) return <div>Loading prices...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {pairs.map(pair => (
        <div key={pair.pairAddress}>
          {pair.pairAddress}: {prices[pair.pairAddress] || 'N/A'}
        </div>
      ))}
    </div>
  )
}
```

## API 参考

### `useLBPairPrice(pairAddress, binStep)`

**参数：**
- `pairAddress: string | undefined` - LB pair 合约地址
- `binStep: number | undefined` - Bin step（基点单位）

**返回值：**
- `currentPrice: number | null` - 当前价格
- `loading: boolean` - 加载状态
- `error: string | null` - 错误信息
- `refetch: () => void` - 手动刷新函数

### `useMultipleLBPairPrices(pairs)`

**参数：**
- `pairs: Array<{ pairAddress: string; binStep: number }> | undefined` - 交易对配置数组

**返回值：**
- `prices: Record<string, number>` - 价格对象（以 pairAddress 为 key）
- `loading: boolean` - 加载状态
- `error: string | null` - 错误信息
- `refetch: () => void` - 手动刷新函数

## 价格计算原理

1. **获取活跃 Bin ID**：调用 LB pair 合约的 `getActiveId()` 函数
2. **计算价格**：使用 LB SDK 的 `Bin.getPriceFromId(activeBinId, binStep)` 函数
3. **精确度**：使用官方 SDK 确保计算精度与协议一致

## 集成到现有组件

### usePriceRange Hook

`usePriceRange` hook 已经更新为使用链上价格：

```typescript
// 在 AddLiquidityForm 中
const {
  activeBinPrice,    // 使用链上价格（如果可用）
  getCurrentPrice,   // 格式化的价格字符串
  chainPrice,        // 原始链上价格
  // ... 其他返回值
} = usePriceRange(selectedPool)
```

### 价格显示增强

当价格来自链上时，UI 会显示 "🔗 On-chain" 标识：

```typescript
{chainPrice && (
  <Typography variant="caption" sx={{ 
    color: 'rgba(76, 175, 80, 0.8)', 
    ml: 1,
    fontSize: '0.75rem'
  }}>
    🔗 On-chain
  </Typography>
)}
```

## 注意事项

1. **网络请求**：每次 hook 调用都会进行链上查询，请合理使用
2. **缓存**：考虑在应用层面实现缓存机制
3. **错误处理**：始终检查 `error` 状态并提供后备方案
4. **性能**：批量获取多个价格比单独获取更高效

## 示例组件

查看 `src/components/examples/LBPairPriceExample.tsx` 获取完整的使用示例。

## 错误处理

常见错误及解决方案：

- **Invalid pair address**：检查合约地址是否正确
- **Network error**：检查网络连接和 RPC 端点
- **Contract not found**：确保合约已部署到当前网络
- **Invalid bin step**：确保 bin step 与池子配置匹配
