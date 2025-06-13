import express from "express";
import { TokenInfo, PairInfo, SwapTransaction, LiquidityTransaction, DEXStats, NetworkConfig } from "./types";
import { createServer } from "http";
import { ethers } from "ethers";
import cors from "cors";

// In-memory storage for demo purposes (use proper database in production)
const swapTransactions: SwapTransaction[] = [];
const liquidityTransactions: LiquidityTransaction[] = [];
const supportedTokens: TokenInfo[] = [];
const tradingPairs: PairInfo[] = [];

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

// Blockchain configuration
const defaultChainId = 56; // BSC
const providerUrl = networkConfigs[defaultChainId].rpcUrl;
const signerPrivateKey = process.env.PRIVATE_KEY;

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Initialize with some demo tokens
const initializeDemoData = () => {
  // Demo tokens
  supportedTokens.push(
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
  );

  // Demo trading pair
  tradingPairs.push({
    token0: supportedTokens[0],
    token1: supportedTokens[1],
    pairAddress: "0x1234567890123456789012345678901234567890",
    reserve0: ethers.parseUnits("1000000", 18).toString(),
    reserve1: ethers.parseUnits("2000000", 18).toString(), 
    totalSupply: ethers.parseUnits("1414213", 18).toString()
  });
};

initializeDemoData();

// Get supported tokens
app.get("/api/tokens", (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: supportedTokens
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trading pairs
app.get("/api/pairs", (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: tradingPairs
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Faucet endpoint for testnet tokens
app.get("/api/faucet/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid wallet address" 
      });
    }

    const ERC20Abi = [
      "function mint(address to, uint256 amount) public",
      "function balanceOf(address account) view returns (uint256)",
      "function symbol() view returns (string)"
    ];

    const tokenAAddress = "0xafC9D020d0b67522337058f0fDea057769dd386A";
    const tokenBAddress = "0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882";

    if (!signerPrivateKey) {
      throw new Error("Private key not configured");
    }

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);

    // Mint Token A
    const tokenAContract = new ethers.Contract(tokenAAddress, ERC20Abi, signer);
    const amountA = ethers.parseUnits("10000", 18);
    const txA = await tokenAContract.mint(wallet, amountA);
    const receiptA = await txA.wait();

    // Mint Token B  
    const tokenBContract = new ethers.Contract(tokenBAddress, ERC20Abi, signer);
    const amountB = ethers.parseUnits("15000", 18);
    const txB = await tokenBContract.mint(wallet, amountB);
    const receiptB = await txB.wait();

    res.status(200).json({
      success: true,
      message: "Tokens minted successfully",
      data: {
        tokenA: {
          amount: "10000",
          txHash: receiptA?.hash
        },
        tokenB: {
          amount: "15000", 
          txHash: receiptB?.hash
        }
      }
    });
  } catch (error: any) {
    console.error("Faucet error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token price/exchange rate
app.get("/api/price/:tokenA/:tokenB", (req, res) => {
  try {
    const { tokenA, tokenB } = req.params;
    
    // Demo price calculation - in production, get from DEX reserves
    const demoPrice = 2.1; // 1 TOKEN A = 2.1 TOKEN B
    
    res.status(200).json({
      success: true,
      data: {
        tokenA,
        tokenB,
        price: demoPrice,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit swap transaction
app.post("/api/swap", (req, res) => {
  try {
    const { user, tokenIn, tokenOut, amountIn, amountOut, txHash } = req.body;

    if (!user || !tokenIn || !tokenOut || !amountIn || !amountOut) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const swapTx: SwapTransaction = {
      id: Date.now().toString(),
      user,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      timestamp: new Date(),
      txHash: txHash || "",
      status: 'pending'
    };

    swapTransactions.push(swapTx);

    res.status(201).json({
      success: true,
      message: "Swap transaction recorded",
      data: swapTx
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get swap history
app.get("/api/swaps/:user?", (req, res) => {
  try {
    const { user } = req.params;
    const { limit = 50 } = req.query;

    let transactions = swapTransactions;
    
    if (user) {
      transactions = transactions.filter(tx => tx.user.toLowerCase() === user.toLowerCase());
    }

    transactions = transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, Number(limit));

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get DEX statistics
app.get("/api/stats", (req, res) => {
  try {
    const stats: DEXStats = {
      totalValueLocked: "12450789.50",
      volume24h: "2456789.25", 
      totalTransactions: swapTransactions.length + liquidityTransactions.length,
      activePairs: tradingPairs.length
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "UNC DEX Backend is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.info(
    `🚀 UNC DEX Backend Server started on`,
    httpServer.address(),
    `PID ${process.pid}`
  );
  console.info(`📊 Available endpoints:`);
  console.info(`   GET  /api/health`);
  console.info(`   GET  /api/tokens`);
  console.info(`   GET  /api/pairs`);
  console.info(`   GET  /api/faucet/:wallet`);
  console.info(`   GET  /api/price/:tokenA/:tokenB`);
  console.info(`   POST /api/swap`);
  console.info(`   GET  /api/swaps/:user?`);
  console.info(`   GET  /api/stats`);
});
