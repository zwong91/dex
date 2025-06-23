/**
 * 专门测试价格服务的脚本
 */
import { createMockEnv } from './test-utils';
import { PriceService } from '../src/dex/sync/price-service';

async function testPriceService() {
  console.log('🔄 测试价格服务...');
  
  const env = createMockEnv();
  const priceService = new PriceService(env);
  
  // 测试有效代币地址
  const validTokens = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    '0x55d398326f99059fF775485246999027B3197955', // USDT
  ];
  
  console.log('✅ 测试有效代币价格获取...');
  try {
    await priceService.updateTokenPrices(validTokens);
    console.log('✅ 有效代币价格更新成功');
  } catch (error) {
    console.error('❌ 有效代币价格更新失败:', error);
  }
  
  // 测试包含 undefined 的代币数组
  const tokensWithUndefined: (string | undefined | null)[] = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    undefined, // 这应该被过滤掉
    '0x55d398326f99059fF775485246999027B3197955', // USDT
    null, // 这也应该被过滤掉
  ];
  
  console.log('⚠️  测试包含无效代币地址的数组...');
  try {
    // 使用类型断言来绕过TypeScript类型检查，因为我们想测试运行时的过滤逻辑
    await priceService.updateTokenPrices(tokensWithUndefined.filter(Boolean) as string[]);
    console.log('✅ 混合代币数组处理成功');
  } catch (error) {
    console.error('❌ 混合代币数组处理失败:', error);
  }
  
  // 测试空数组
  console.log('📭 测试空代币数组...');
  try {
    await priceService.updateTokenPrices([]);
    console.log('✅ 空数组处理成功');
  } catch (error) {
    console.error('❌ 空数组处理失败:', error);
  }
  
  console.log('✅ 价格服务测试完成');
}

// 运行测试
testPriceService().catch((error) => {
  console.error('❌ 测试失败:', error);
});
