# TypeScript & React Style Guide

## TypeScript Best Practices

### Type Definitions

- Use `interface` for object shapes that might be extended
- Use `type` for unions, intersections, and computed types
- Always prefer explicit return types for functions
- Use `const assertions` for immutable data structures

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  email: string
}

type Status = 'pending' | 'success' | 'error'

const fetchUser = async (id: string): Promise<UserData> => {
  // implementation
}

// ✅ Const assertion
const CHAIN_IDS = [1, 56, 97] as const
type ChainId = typeof CHAIN_IDS[number]
```

### Naming Conventions

- Use `PascalCase` for components, interfaces, types, enums
- Use `camelCase` for variables, functions, methods
- Use `SCREAMING_SNAKE_CASE` for constants
- Use descriptive names, avoid abbreviations

```typescript
// ✅ Good
interface TokenInfo {
  address: string
  symbol: string
  decimals: number
}

const SUPPORTED_CHAINS = [1, 56] as const
const calculateSlippage = (amount: bigint, slippageBps: number) => {}

// ❌ Bad
interface TknInfo {}
const chains = [1, 56]
const calcSlip = () => {}
```

### React Component Patterns

- Use functional components with hooks
- Extract custom hooks for reusable logic
- Use proper TypeScript for props and state

```typescript
// ✅ Good component structure
interface SwapFormProps {
  tokenA: Token
  tokenB: Token
  onSwap: (params: SwapParams) => Promise<void>
  isLoading?: boolean
}

const SwapForm: React.FC<SwapFormProps> = ({ 
  tokenA, 
  tokenB, 
  onSwap, 
  isLoading = false 
}) => {
  const [amount, setAmount] = useState<string>('')
  
  // Custom hook usage
  const { slippage, setSlippage } = useSlippageSettings()
  
  return (
    // JSX implementation
  )
}
```

### Error Handling

- Use discriminated unions for API responses
- Implement proper error boundaries
- Use Result pattern for functions that can fail

```typescript
// ✅ Result pattern
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

const parseAmount = (input: string): Result<bigint, string> => {
  try {
    const amount = parseUnits(input, 18)
    return { success: true, data: amount }
  } catch {
    return { success: false, error: 'Invalid amount format' }
  }
}
```

### Web3 Specific Types

- Use proper types for blockchain data
- Leverage wagmi/viem types when possible
- Create specific types for contract interactions

```typescript
// ✅ Web3 types
interface SwapParams {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  amountOutMin: bigint
  deadline: bigint
  to: Address
}

interface Pool {
  address: Address
  token0: Token
  token1: Token
  fee: number
  liquidity: bigint
}

// Use branded types for safety
type TokenAmount = bigint & { readonly brand: unique symbol }
```

### Async Patterns

- Use proper async/await patterns
- Handle loading states consistently
- Implement proper cancellation for requests

```typescript
// ✅ Custom hook for async operations
const useSwap = () => {
  const [state, setState] = useState<{
    isLoading: boolean
    error: string | null
    txHash: string | null
  }>({ isLoading: false, error: null, txHash: null })

  const swap = useCallback(async (params: SwapParams) => {
    setState({ isLoading: true, error: null, txHash: null })
    
    try {
      const hash = await executeSwap(params)
      setState({ isLoading: false, error: null, txHash: hash })
      return hash
    } catch (error) {
      setState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Swap failed',
        txHash: null 
      })
      throw error
    }
  }, [])

  return { ...state, swap }
}
```

### Performance Optimizations

- Use `React.memo` for expensive components
- Memoize complex calculations with `useMemo`
- Use `useCallback` for event handlers passed to children

```typescript
// ✅ Optimized component
interface TokenListProps {
  tokens: Token[]
  onSelect: (token: Token) => void
  filter: string
}

const TokenList = React.memo<TokenListProps>(({ tokens, onSelect, filter }) => {
  const filteredTokens = useMemo(() => 
    tokens.filter(token => 
      token.symbol.toLowerCase().includes(filter.toLowerCase())
    ), [tokens, filter]
  )

  const handleSelect = useCallback((token: Token) => {
    onSelect(token)
  }, [onSelect])

  return (
    <div>
      {filteredTokens.map(token => (
        <TokenItem 
          key={token.address}
          token={token}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
})
```

## Code Organization

### File Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements
│   └── forms/          # Form components
├── pages/              # Page components
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # App constants
└── dex/               # DEX-specific logic
    ├── hooks/         # DEX hooks
    ├── utils/         # DEX utilities
    └── types/         # DEX types
```

### Import/Export Patterns

- Use named exports by default
- Group imports by source (external, internal, relative)
- Use barrel exports for related modules

```typescript
// ✅ Import grouping
import React, { useState, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { useAccount, useBalance } from 'wagmi'

import { SwapForm } from '@/components/forms'
import { useTokenList } from '@/hooks'
import { formatTokenAmount } from '@/utils'

import { useSwapQuote } from './hooks/useSwapQuote'
```

## Formatting Rules

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Trailing commas in objects and arrays
- Arrow functions for inline callbacks
- Destructuring when accessing multiple properties

```typescript
// ✅ Formatting example
const TokenInfo: React.FC<{ token: Token }> = ({ token }) => {
  const { address, symbol, decimals, logoURI } = token
  
  const formattedBalance = useMemo(() => {
    if (!balance) return '0'
    return formatUnits(balance, decimals)
  }, [balance, decimals])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <img src={logoURI} alt={symbol} width={24} height={24} />
      <Typography variant="body1">{symbol}</Typography>
      <Typography variant="body2" color="text.secondary">
        {formattedBalance}
      </Typography>
    </Box>
  )
}
```
