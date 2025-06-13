import axios from "axios";
import { ethers } from "ethers";

async function testDEXAPI() {
  const baseUrl = "http://localhost:3000/api";

  try {
    console.log("🧪 Testing UNC DEX API...\n");

    // 1. Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log("✅ Health:", healthResponse.data.message);

    // 2. Test tokens endpoint
    console.log("\n2. Testing tokens endpoint...");
    const tokensResponse = await axios.get(`${baseUrl}/tokens`);
    console.log("✅ Tokens available:", tokensResponse.data.data.length);
    tokensResponse.data.data.forEach((token: any) => {
      console.log(`   - ${token.symbol}: ${token.name} (${token.address})`);
    });

    // 3. Test trading pairs
    console.log("\n3. Testing trading pairs...");
    const pairsResponse = await axios.get(`${baseUrl}/pairs`);
    console.log("✅ Trading pairs:", pairsResponse.data.data.length);
    pairsResponse.data.data.forEach((pair: any) => {
      console.log(`   - ${pair.token0.symbol}/${pair.token1.symbol}`);
    });

    // 4. Test price endpoint
    console.log("\n4. Testing price endpoint...");
    const priceResponse = await axios.get(`${baseUrl}/price/TOKEN A/TOKEN B`);
    console.log("✅ Exchange rate:", `1 TOKEN A = ${priceResponse.data.data.price} TOKEN B`);

    // 5. Test stats endpoint
    console.log("\n5. Testing DEX statistics...");
    const statsResponse = await axios.get(`${baseUrl}/stats`);
    const stats = statsResponse.data.data;
    console.log("✅ DEX Stats:");
    console.log(`   - Total Value Locked: $${stats.totalValueLocked}`);
    console.log(`   - 24h Volume: $${stats.volume24h}`);
    console.log(`   - Total Transactions: ${stats.totalTransactions}`);
    console.log(`   - Active Pairs: ${stats.activePairs}`);

    // 6. Test swap transaction recording
    console.log("\n6. Testing swap transaction recording...");
    const testWallet = ethers.Wallet.createRandom();
    const swapData = {
      user: testWallet.address,
      tokenIn: "TOKEN A",
      tokenOut: "TOKEN B", 
      amountIn: "100.0",
      amountOut: "210.0",
      txHash: "0x" + Math.random().toString(16).substr(2, 64)
    };
    
    const swapResponse = await axios.post(`${baseUrl}/swap`, swapData);
    console.log("✅ Swap recorded:", swapResponse.data.data.id);

    // 7. Test swap history
    console.log("\n7. Testing swap history...");
    const historyResponse = await axios.get(`${baseUrl}/swaps`);
    console.log("✅ Swap history:", historyResponse.data.data.length, "transactions");

    // 8. Test faucet (optional - requires private key)
    console.log("\n8. Testing faucet...");
    try {
      const faucetResponse = await axios.get(`${baseUrl}/faucet/${testWallet.address}`);
      console.log("✅ Faucet:", faucetResponse.data.message);
    } catch (faucetError: any) {
      if (faucetError.response?.status === 500 && faucetError.response?.data?.error?.includes("Private key")) {
        console.log("⚠️  Faucet: Private key not configured (expected for demo)");
      } else {
        console.log("❌ Faucet error:", faucetError.message);
      }
    }

    console.log("\n✅ All tests completed successfully!");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    if (error.response?.data) {
      console.error("Error details:", error.response.data);
    }
  }
}

// Test individual endpoints
async function testHealthOnly() {
  try {
    const response = await axios.get("http://localhost:3000/api/health");
    console.log("✅ Server is running:", response.data);
  } catch (error: any) {
    console.error("❌ Server is not running:", error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--health-only')) {
    await testHealthOnly();
  } else {
    await testDEXAPI();
  }
}

main().catch(console.error);
