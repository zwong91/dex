// Test file to verify sync services can be imported and instantiated
import { DatabaseService } from './database-service';
import { OnChainService } from './onchain-service';
import { PriceService } from './price-service';
import { SyncService } from './sync-service';
import type { Env } from '../../index';

// Mock environment for testing
const mockEnv: Env = {
  DB: {} as any,
  D1_DATABASE: {} as any,
  R2: {} as any,
  BSC_RPC_URL: 'https://test.rpc.url',
  BSCTEST_RPC_URL: 'https://test.rpc.url',
  COINGECKO_API_KEY: 'test-key',
  SYNC_ENABLED: 'true'
};

// Test instantiation
try {
  const databaseService = new DatabaseService(mockEnv);
  const onChainService = new OnChainService(mockEnv);
  const priceService = new PriceService(mockEnv);
  const syncService = new SyncService(mockEnv);

  console.log('✅ All sync services instantiated successfully');
  console.log('✅ DatabaseService:', typeof databaseService);
  console.log('✅ OnChainService:', typeof onChainService);
  console.log('✅ PriceService:', typeof priceService);
  console.log('✅ SyncService:', typeof syncService);
  
} catch (error) {
  console.error('❌ Error instantiating sync services:', error);
}
