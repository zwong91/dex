# AddLiquidityForm

## 文件结构

```
src/components/pool/add-liquidity/
├── index.ts                          # 主导出文件
├── AddLiquidityButton.tsx            # 添加流动性按钮组件
├── PriceInfoGrid.tsx                 # 价格信息网格组件  
├── PriceRangeSlider.tsx              # 价格范围滑块组件
├── PriceRangeVisualizer.tsx          # 价格范围可视化组件
├── StrategySelection.tsx             # 策略选择组件
├── TokenAmountInput.tsx              # 代币输入组件
├── hooks/
│   ├── useAddLiquidity.ts            # 添加流动性逻辑钩子
│   └── usePriceRange.ts              # 价格范围计算钩子
└── utils/
    └── calculations.ts               # 计算工具函数
```

## 组件职责

### 1. TokenAmountInput.tsx

- 处理单个代币的数量输入
- 显示代币余额
- 提供 50% 和 MAX 按钮

### 2. StrategySelection.tsx

- 流动性策略选择 (Spot, Curve, Bid-Ask)
- 显示策略描述和可视化图表
- 根据输入金额显示动态提示

### 3. PriceRangeVisualizer.tsx

- 3D 价格范围可视化
- 动态流动性分布显示
- 当前价格指示器

### 4. PriceRangeSlider.tsx

- 价格范围滑块控制
- 可拖拽的最小/最大价格设置

### 5. PriceInfoGrid.tsx

- 显示最小价格、最大价格、Bins 数量
- 显示代币分布信息

### 6. AddLiquidityButton.tsx

- 添加流动性按钮
- 错误处理和状态显示
- 重置价格功能

## 自定义钩子

### usePriceRange.ts

- 价格范围状态管理
- 动态范围计算
- Bins 数量计算

### useAddLiquidity.ts

- 添加流动性业务逻辑
- 错误处理
- 交易状态管理

## 工具函数

### calculations.ts

- 自动填充金额计算
- 百分比金额计算

## 使用方法

```tsx
import AddLiquidityForm from './components/pool/AddLiquidityForm'

// 在组件中使用
<AddLiquidityForm
  selectedPool={poolData}
  chainId={chainId}
  onSuccess={() => console.log('Success!')}
/>
```
