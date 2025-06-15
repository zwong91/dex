import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { Env } from '../index';

// Types for DEX operations
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface PairInfo {
  token0: TokenInfo;
  token1: TokenInfo;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
}

interface SwapTransaction {
  id: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: Date;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
}

interface LiquidityTransaction {
  id: string;
  user: string;
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  liquidity: string;
  timestamp: Date;
  txHash: string;
  type: 'add' | 'remove';
  status: 'pending' | 'completed' | 'failed';
}

interface DEXStats {
  totalValueLocked: string;
  volume24h: string;
  totalTransactions: number;
  activePairs: number;
}

interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// In-memory storage for demo purposes (in production, use database)
let swapTransactions: SwapTransaction[] = [];
let liquidityTransactions: LiquidityTransaction[] = [];
let supportedTokens: TokenInfo[] = [];
let tradingPairs: PairInfo[] = [];

// Network configurations
const networkConfigs: Record<number, NetworkConfig> = {
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
  },
  56: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    blockExplorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }
  },
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com/",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }
  }
};

// Initialize demo data
const initializeDemoData = () => {
  // Demo tokens
  supportedTokens = [
    {
      address: "0xafC9D020d0b67522337058f0fDea057769dd386A",
      symbol: "TOKEN A",
      name: "Token A",
      decimals: 18,
      logoURI: "/token-a-logo.png"
    },
    {
      address: "0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882",
      symbol: "TOKEN B", 
      name: "Token B",
      decimals: 18,
      logoURI: "/token-b-logo.png"
    }
  ];

  // Demo trading pair
  if (supportedTokens.length >= 2) {
    tradingPairs = [{
      token0: supportedTokens[0]!,
      token1: supportedTokens[1]!,
      pairAddress: "0x1234567890123456789012345678901234567890",
      reserve0: "1000000000000000000000000", // 1M tokens
      reserve1: "2000000000000000000000000", // 2M tokens
      totalSupply: "1414213562373095048801689" // sqrt(1M * 2M)
    }];
  }
};

// Initialize data on startup
initializeDemoData();

export function createDexHandler(): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();

  // CORS middleware
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Validation schemas
  const swapSchema = z.object({
    user: z.string(),
    tokenIn: z.string(),
    tokenOut: z.string(),
    amountIn: z.string(),
    amountOut: z.string(),
    txHash: z.string().optional(),
  });

  const liquiditySchema = z.object({
    user: z.string(),
    tokenA: z.string(),
    tokenB: z.string(),
    amountA: z.string(),
    amountB: z.string(),
    liquidity: z.string(),
    txHash: z.string(),
    type: z.enum(['add', 'remove']),
  });

  // Get supported tokens
  app.get('/tokens', (c) => {
    try {
      return c.json({
        success: true,
        data: supportedTokens
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get trading pairs
  app.get('/pairs', (c) => {
    try {
      return c.json({
        success: true,
        data: tradingPairs
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get network configurations
  app.get('/networks', (c) => {
    try {
      return c.json({
        success: true,
        data: networkConfigs
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Faucet endpoint for testnet tokens
  app.get('/faucet/:wallet', async (c) => {
    try {
      const wallet = c.req.param('wallet');
      
      // Basic address validation (simplified for demo)
      if (!wallet || wallet.length !== 42 || !wallet.startsWith('0x')) {
        return c.json({ 
          success: false, 
          error: "Invalid wallet address" 
        }, 400);
      }

      // Demo response - in production, this would interact with smart contracts
      const faucetResult = {
        tokenA: {
          amount: "10000",
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        },
        tokenB: {
          amount: "15000", 
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        }
      };

      return c.json({
        success: true,
        message: "Tokens minted successfully",
        data: faucetResult
      });
    } catch (error: any) {
      console.error("Faucet error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get token price/exchange rate
  app.get('/price/:tokenA/:tokenB', (c) => {
    try {
      const tokenA = c.req.param('tokenA');
      const tokenB = c.req.param('tokenB');
      
      // Demo price calculation - in production, calculate from DEX reserves
      const demoPrice = 2.1; // 1 TOKEN A = 2.1 TOKEN B
      
      return c.json({
        success: true,
        data: {
          tokenA,
          tokenB,
          price: demoPrice,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Submit swap transaction
  app.post('/swap', async (c) => {
    try {
      const body = await c.req.json();
      const validatedData = swapSchema.parse(body);

      const swapTx: SwapTransaction = {
        id: Date.now().toString(),
        user: validatedData.user,
        tokenIn: validatedData.tokenIn,
        tokenOut: validatedData.tokenOut,
        amountIn: validatedData.amountIn,
        amountOut: validatedData.amountOut,
        timestamp: new Date(),
        txHash: validatedData.txHash || "",
        status: 'pending'
      };

      swapTransactions.push(swapTx);

      return c.json({
        success: true,
        message: "Swap transaction recorded",
        data: swapTx
      }, 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          error: "Invalid request data",
          details: error.errors
        }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Submit liquidity transaction
  app.post('/liquidity', async (c) => {
    try {
      const body = await c.req.json();
      const validatedData = liquiditySchema.parse(body);

      const liquidityTx: LiquidityTransaction = {
        id: Date.now().toString(),
        user: validatedData.user,
        tokenA: validatedData.tokenA,
        tokenB: validatedData.tokenB,
        amountA: validatedData.amountA,
        amountB: validatedData.amountB,
        liquidity: validatedData.liquidity,
        timestamp: new Date(),
        txHash: validatedData.txHash,
        type: validatedData.type,
        status: 'pending'
      };

      liquidityTransactions.push(liquidityTx);

      return c.json({
        success: true,
        message: "Liquidity transaction recorded",
        data: liquidityTx
      }, 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          error: "Invalid request data",
          details: error.errors
        }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get swap history
  app.get('/swaps/:user?', (c) => {
    try {
      const user = c.req.param('user');
      const limit = Number(c.req.query('limit')) || 50;

      let transactions = [...swapTransactions];
      
      if (user) {
        transactions = transactions.filter(tx => 
          tx.user.toLowerCase() === user.toLowerCase()
        );
      }

      transactions = transactions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      return c.json({
        success: true,
        data: transactions
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get liquidity history
  app.get('/liquidity/:user?', (c) => {
    try {
      const user = c.req.param('user');
      const limit = Number(c.req.query('limit')) || 50;

      let transactions = [...liquidityTransactions];
      
      if (user) {
        transactions = transactions.filter(tx => 
          tx.user.toLowerCase() === user.toLowerCase()
        );
      }

      transactions = transactions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      return c.json({
        success: true,
        data: transactions
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get DEX statistics
  app.get('/stats', (c) => {
    try {
      const stats: DEXStats = {
        totalValueLocked: "12450789.50",
        volume24h: "2456789.25", 
        totalTransactions: swapTransactions.length + liquidityTransactions.length,
        activePairs: tradingPairs.length
      };

      return c.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      success: true,
      message: "DEX API is running on Cloudflare Workers",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      platform: "Cloudflare Workers + Hono"
    });
  });

  return app;
}
