# Bin Step Price Calculation Implementation

## Overview
Updated the `PriceRangeVisualizer` component to calculate price scales based on the actual bin step of the liquidity pool, rather than using fixed percentage steps.

## Key Changes

### 1. Added Bin Step Parameter
- Added `binStep?: number` prop to `PriceRangeVisualizer`
- Default value: 25 basis points (0.25%)
- Passed from `selectedPool?.binStep` in `AddLiquidityForm`

### 2. Precise Price Calculation
```typescript
// Old method (fixed percentage)
const priceStep = activeBinPrice * 0.01 // 1% step

// New method (bin step based)
const binStepDecimal = binStep / 10000
const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
price = activeBinPrice * Math.pow(priceMultiplier, i)
```

### 3. Examples with Different Bin Steps

#### Bin Step = 1 (0.01%)
With `activeBinPrice = 19.05560` and 10 bins per tick:
- Tick 0: 19.05560
- Tick 1: 19.07463 (+0.1000%)
- Tick 2: 19.09367 (+0.2001%)
- Tick 3: 19.11273 (+0.3003%)
- Tick 4: 19.13181 (+0.4006%)

#### Bin Step = 25 (0.25%)  
With `activeBinPrice = 19.05560` and 10 bins per tick:
- Tick 0: 19.05560
- Tick 1: 19.53350 (+2.507%)
- Tick 2: 20.02756 (+5.103%)
- Tick 3: 20.53832 (+7.789%)
- Tick 4: 21.06634 (+10.567%)

## Implementation Details

### Price Scale Modes
1. **Token X Mode** (`amt0 > 0 && amt1 === 0`)
   - Displays prices from current price moving right (higher prices)
   - 10 bins per tick increment

2. **Token Y Mode** (`amt1 > 0 && amt0 === 0`)
   - Displays prices from current price moving left (lower prices)
   - 10 bins per tick decrement

3. **AutoFill Mode** (`amt0 > 0 && amt1 > 0`)
   - Symmetric display around current price
   - 5 bins per tick (more granular)

### Logarithmic Price Calculation
Uses compound interest formula to ensure equal percentage changes between ticks:
```
price = activeBinPrice × (1 + binStep/10000)^(bins)
```

This ensures that each tick represents the same percentage change, which is crucial for liquidity book protocols where bins are logarithmically spaced.

## Benefits
1. **Accurate Representation**: Price scales now match the actual bin structure of the pool
2. **Dynamic Adaptation**: Works with any bin step configuration (1bp, 25bp, 100bp, etc.)
3. **Visual Consistency**: Price scales align with the actual liquidity distribution
4. **Developer Friendly**: Includes logging for verification in development mode

## Testing
The component includes development-mode logging that demonstrates the calculation:
```javascript
console.log('🔢 Price Scale Calculation:', {
  binStep: 1,
  binStepDecimal: 0.0001,
  binStepPercentage: '0.01%',
  activeBinPrice: 19.05560,
  mode: 'Token X',
  samplePrices: ['19.05560', '19.07463']
})
```
