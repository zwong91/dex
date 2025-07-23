import { ethers } from 'ethers';

// Network configurations
const NETWORKS = {
  testnet: {
    name: 'BSC Testnet (Chapel)',
    rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    oracle_dex_lens_address: '0xb512457fcB3020dC4a62480925B68dc83E776340',
    wrapped_native_token_address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    usdc_address: '0x64544969ed7EBf5f083679233325356EbE738930',
    usdt_address: '0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684' // BSC testnet USDT
  },
  mainnet: {
    name: 'BSC Mainnet',
    rpc: 'https://bsc-dataseed1.bnbchain.org',
    oracle_dex_lens_address: '0x8F4598bDfE142d2C8930a6A6c1B3F92e3975AeB1',
    wrapped_native_token_address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    usdc_address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC mainnet USDC
    usdt_address: '0x55d398326f99059fF775485246999027B3197955'  // BSC mainnet USDT
  }
};

// Select network (change this to 'mainnet' or 'testnet')
const SELECTED_NETWORK = process.env.NETWORK || 'testnet';
const config = NETWORKS[SELECTED_NETWORK];

if (!config) {
  console.error(`❌ Invalid network: ${SELECTED_NETWORK}. Use 'mainnet' or 'testnet'`);
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(config.rpc);

// DexLens ABI
const dexLensABI = [
  "function getTokenPriceUSD(address token) external view returns (uint256)",
  "function getTokenPriceNative(address token) external view returns (uint256)"
];

// ERC20 ABI for token info
const erc20ABI = [
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)"
];

async function getTokenInfo(address) {
  const token = new ethers.Contract(address, erc20ABI, provider);
  try {
    const [symbol, decimals, name] = await Promise.all([
      token.symbol(),
      token.decimals(),
      token.name()
    ]);
    return { symbol, decimals, name };
  } catch (error) {
    return { symbol: "UNKNOWN", decimals: 18, name: "UNKNOWN" };
  }
}

async function debugPrices() {
  try {
    const dexLens = new ethers.Contract(config.oracle_dex_lens_address, dexLensABI, provider);
    
    console.log('═'.repeat(60));
    console.log(`🔍 Price Oracle Debug - ${config.name}`);
    console.log('═'.repeat(60));
    console.log(`📍 Oracle Address: ${config.oracle_dex_lens_address}`);
    console.log(`🌐 RPC Endpoint: ${config.rpc}`);
    console.log('');

    // Get token info first
    console.log('🔍 Token Information');
    console.log('─'.repeat(30));
    const [wbnbInfo, usdcInfo, usdtInfo] = await Promise.all([
      getTokenInfo(config.wrapped_native_token_address),
      getTokenInfo(config.usdc_address),
      getTokenInfo(config.usdt_address)
    ]);
    
    console.log(`WBNB: ${wbnbInfo.name} (${wbnbInfo.symbol}) - ${wbnbInfo.decimals} decimals`);
    console.log(`USDC: ${usdcInfo.name} (${usdcInfo.symbol}) - ${usdcInfo.decimals} decimals`);
    console.log(`USDT: ${usdtInfo.name} (${usdtInfo.symbol}) - ${usdtInfo.decimals} decimals`);
    console.log('');

    // Get WBNB price in USD
    console.log('💰 WBNB Price Analysis');
    console.log('─'.repeat(30));
    const wbnbPriceUSD = await dexLens.getTokenPriceUSD(config.wrapped_native_token_address);
    console.log(`Raw Value: ${wbnbPriceUSD.toString()}`);
    console.log(`USD Price: $${Number(ethers.formatEther(wbnbPriceUSD)).toFixed(4)}`);
    console.log('');
    
    // Get USDC price in USD
    console.log('💵 USDC Price Analysis');
    console.log('─'.repeat(30));
    const usdcPriceUSD = await dexLens.getTokenPriceUSD(config.usdc_address);
    console.log(`Raw Value: ${usdcPriceUSD.toString()}`);
    console.log(`USD Price (18 decimals): $${Number(ethers.formatEther(usdcPriceUSD)).toFixed(6)}`);
    
    // Try adjusting for 6 decimals if this is supposed to be real USDC
    if (usdcInfo.decimals === 18 && usdcInfo.symbol === 'USDC') {
      const adjustedPrice = Number(usdcPriceUSD) / (10 ** 12); // Convert from 18 to 6 decimal scaling
      console.log(`USD Price (adjusted for 6 decimals): $${(adjustedPrice / (10 ** 6)).toFixed(6)}`);
    }
    console.log('');
    
    // Get USDT price in USD
    console.log('💵 USDT Price Analysis');
    console.log('─'.repeat(30));
    try {
      const usdtPriceUSD = await dexLens.getTokenPriceUSD(config.usdt_address);
      console.log(`Raw Value: ${usdtPriceUSD.toString()}`);
      console.log(`USD Price (${usdtInfo.decimals} decimals): $${Number(ethers.formatEther(usdtPriceUSD)).toFixed(6)}`);
      
      // Try adjusting for 6 decimals if this is supposed to be real USDT
      if (usdtInfo.decimals === 18 && usdtInfo.symbol === 'USDT') {
        const adjustedPrice = Number(usdtPriceUSD) / (10 ** 12); // Convert from 18 to 6 decimal scaling
        console.log(`USD Price (adjusted for 6 decimals): $${(adjustedPrice / (10 ** 6)).toFixed(6)}`);
      }
    } catch (error) {
      console.log('❌ Failed to get USDT USD price');
      console.log(`   Error: ${error.message}`);
      console.log(`   This likely means the oracle doesn't have price data for this USDT token`);
      console.log(`   Token address: ${config.usdt_address}`);
    }
    console.log('');
    
    // Get USDC price in WBNB
    console.log('🔄 USDC/WBNB Exchange Rate');
    console.log('─'.repeat(30));
    const usdcPriceNative = await dexLens.getTokenPriceNative(config.usdc_address);
    console.log(`Raw Value: ${usdcPriceNative.toString()}`);
    
    const usdcInWbnb = Number(ethers.formatEther(usdcPriceNative));
    const wbnbInUsdc = 1 / usdcInWbnb;
    
    console.log(`USDC in WBNB: ${usdcInWbnb.toFixed(8)} WBNB per USDC`);
    console.log(`WBNB in USDC: ${wbnbInUsdc.toFixed(2)} USDC per WBNB`);
    
    // Sanity check
    const wbnbUsdPrice = Number(ethers.formatEther(wbnbPriceUSD));
    const usdcUsdPrice = Number(ethers.formatEther(usdcPriceUSD));
    const expectedUsdcInWbnb = usdcUsdPrice / wbnbUsdPrice;
    
    console.log(`Expected USDC/WBNB rate: ${expectedUsdcInWbnb.toFixed(8)} WBNB per USDC`);
    console.log(`Actual USDC/WBNB rate: ${usdcInWbnb.toFixed(8)} WBNB per USDC`);
    console.log('');
    
    // Get USDT price in WBNB
    console.log('🔄 USDT/WBNB Exchange Rate');
    console.log('─'.repeat(30));
    try {
      const usdtPriceNative = await dexLens.getTokenPriceNative(config.usdt_address);
      console.log(`Raw Value: ${usdtPriceNative.toString()}`);
      
      const usdtInWbnb = Number(ethers.formatEther(usdtPriceNative));
      const wbnbInUsdt = 1 / usdtInWbnb;
      
      console.log(`USDT in WBNB: ${usdtInWbnb.toFixed(8)} WBNB per USDT`);
      console.log(`WBNB in USDT: ${wbnbInUsdt.toFixed(2)} USDT per WBNB`);
    } catch (error) {
      console.log('❌ Failed to get USDT native price');
      console.log(`   Error: ${error.message}`);
      console.log(`   This likely means the oracle doesn't have price data for this USDT token`);
    }
    console.log('');
    
    // Calculate expected ratio
    console.log('📊 Price Validation');
    console.log('─'.repeat(30));
    const expectedRatio = wbnbUsdPrice / usdcUsdPrice;
    const actualRatio = 1 / usdcInWbnb;
    console.log(`Expected WBNB/USDC Ratio: ${expectedRatio.toFixed(8)}`);
    console.log(`Actual WBNB/USDC Ratio: ${actualRatio.toFixed(8)}`);
    console.log(`Price Difference: ${Math.abs(expectedRatio - actualRatio).toFixed(8)}`);
    
    // Warning about fake tokens
    if (usdcInfo.decimals === 18 && usdcInfo.symbol === 'USDC') {
      console.log('');
      console.log('⚠️  WARNING: This USDC token has 18 decimals instead of 6!');
      console.log('   This is likely a test/fake USDC token, not real USDC.');
      console.log('   Real USDC should be worth ~$1.00, not $800+');
    }
    
    if (usdtInfo.decimals === 18 && usdtInfo.symbol === 'USDT') {
      console.log('');
      console.log('⚠️  WARNING: This USDT token has 18 decimals instead of 6!');
      console.log('   This is likely a test/fake USDT token, not real USDT.');
      console.log('   Real USDT should be worth ~$1.00, not $800+');
    }
    
    // Add recommendations section
    console.log('💡 Recommendations');
    console.log('─'.repeat(30));
    console.log('If USDT price queries failed, the oracle likely doesn\'t have this token configured.');
    console.log('Consider using a different USDT token address, or contact the oracle maintainer');
    console.log('to add price feeds for this token.');
    console.log('');
    console.log('For BSC Testnet, you may want to try:');
    console.log('- Real BSC Testnet USDT: Check BSC testnet token lists');
    console.log('- Use USDC instead: This one seems to work fine');
    console.log('');
    
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// NETWORK=mainnet node debug-price.js
debugPrices();
