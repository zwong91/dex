import { ethers } from 'ethers';

// BSC Testnet provider
const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.bnbchain.org:8545');

// Addresses from your constants
const ORACLE_DEX_LENS_ADDRESS = '0x8C7dc8184F5D78Aa40430b2d37f78fDC3e9A9b78';
const WBNB_ADDRESS = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';
const USDC_ADDRESS = '0x64544969ed7EBf5f083679233325356EbE738930'; // BSC testnet USDC

// DexLens ABI (minimal)
const dexLensABI = [
  "function getTokenPriceUSD(address token) external view returns (uint256)",
  "function getTokenPriceNative(address token) external view returns (uint256)"
];

async function debugPrices() {
  try {
    const dexLens = new ethers.Contract(ORACLE_DEX_LENS_ADDRESS, dexLensABI, provider);
    
    console.log("🔍 Debugging Price Oracle...");
    
    // Get WBNB price in USD
    const wbnbPriceUSD = await dexLens.getTokenPriceUSD(WBNB_ADDRESS);
    console.log(`WBNB Price USD (raw): ${wbnbPriceUSD.toString()}`);
    console.log(`WBNB Price USD (formatted): ${ethers.formatEther(wbnbPriceUSD)}`);
    
    // Get USDC price in USD
    const usdcPriceUSD = await dexLens.getTokenPriceUSD(USDC_ADDRESS);
    console.log(`USDC Price USD (raw): ${usdcPriceUSD.toString()}`);
    console.log(`USDC Price USD (formatted): ${ethers.formatEther(usdcPriceUSD)}`);
    
    // Get USDC price in WBNB
    const usdcPriceNative = await dexLens.getTokenPriceNative(USDC_ADDRESS);
    console.log(`USDC Price in WBNB (raw): ${usdcPriceNative.toString()}`);
    console.log(`USDC Price in WBNB (formatted): ${ethers.formatEther(usdcPriceNative)}`);
    
    // Calculate expected ratio
    const expectedRatio = Number(ethers.formatEther(wbnbPriceUSD)) / Number(ethers.formatEther(usdcPriceUSD));
    console.log(`Expected WBNB/USDC ratio: ${expectedRatio}`);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

debugPrices();
