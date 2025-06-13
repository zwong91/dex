import axios from 'axios';
import { ethers } from 'ethers';

const API_BASE_URL = 'http://localhost:3000/api';

async function testConnectivity() {
  console.log('🔍 Testing API connectivity...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', response.data);
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
  
  return true;
}

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test tokens endpoint
    const tokensResponse = await axios.get(`${API_BASE_URL}/tokens`);
    console.log('✅ Tokens:', tokensResponse.data.data.length, 'tokens available');
    
    // Test pairs endpoint
    const pairsResponse = await axios.get(`${API_BASE_URL}/pairs`);
    console.log('✅ Pairs:', pairsResponse.data.data.length, 'trading pairs available');
    
    // Test price endpoint
    const priceResponse = await axios.get(`${API_BASE_URL}/price/TOKEN A/TOKEN B`);
    console.log('✅ Price:', `1 TOKEN A = ${priceResponse.data.data.price} TOKEN B`);
    
    // Test stats endpoint
    const statsResponse = await axios.get(`${API_BASE_URL}/stats`);
    console.log('✅ Stats:', statsResponse.data.data);
    
    // Test swap history
    const swapsResponse = await axios.get(`${API_BASE_URL}/swaps`);
    console.log('✅ Swaps:', swapsResponse.data.data.length, 'transactions in history');
    
  } catch (error: any) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testFaucet() {
  console.log('🪙 Testing faucet...');
  
  // Generate a random test wallet
  const wallet = ethers.Wallet.createRandom();
  console.log('📱 Test wallet:', wallet.address);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/faucet/${wallet.address}`);
    console.log('✅ Faucet response:', response.data);
  } catch (error: any) {
    console.error('❌ Faucet test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

async function main() {
  console.log('🚀 dex apiTest Suite\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--connectivity-only')) {
    await testConnectivity();
    return;
  }
  
  if (args.includes('--api-only')) {
    await testAPIEndpoints();
    return;
  }
  
  // Run all tests
  const connectivityOk = await testConnectivity();
  
  if (connectivityOk) {
    console.log();
    await testAPIEndpoints();
    console.log();
    await testFaucet();
  }
  
  console.log('\n✨ Test suite completed!');
}

main().catch(console.error);
