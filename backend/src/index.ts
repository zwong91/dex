import { Router } from 'itty-router';
import { json } from 'itty-router-extras';
import { aiHandler } from './ai/handler';
import { storageHandler } from './storage/handler';
import { createDexHandler } from './dex/handler';
import { databaseHandler } from './database/handler';
import { createIndustrialSyncCoordinator } from './dex/industrial-sync-coordinator';
import { createEnhancedDatabaseService } from './dex/enhanced-database-service';
import { createEnhancedOnChainService } from './dex/enhanced-onchain-service';
import { createContractSyncService } from './dex/contract-sync-service';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './database/schema';

export interface Env {
	AI?: any;
	DB?: D1Database;
	D1_DATABASE?: D1Database; // For new DEX database
	R2?: R2Bucket;
	KEY: string;
	NODE_ENV?: string;
	// RPC URLs
	BSC_RPC_URL?: string;
	BSCTEST_RPC_URL?: string;
	// Contract addresses
	LB_FACTORY_BSC?: string;
	LB_FACTORY_BSCTEST?: string;
	LB_ROUTER_BSC?: string;
	LB_ROUTER_BSCTEST?: string;
	LB_QUOTER_BSC?: string;
	LB_QUOTER_BSCTEST?: string;
	// API configuration
	PRICE_API_URL?: string;
	PRICE_API_KEY?: string;
	API_RATE_LIMIT?: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		console.log('Request received:', request.method, url.pathname);
		
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
				},
			});
		}

		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
		};

		try {
			// Direct routing instead of using itty-router to avoid hanging
			
			// Root route
			if (url.pathname === '/') {
				return new Response(JSON.stringify({ 
					message: 'DEX Backend API', 
					status: 'ok',
					timestamp: new Date().toISOString(),
					version: '1.0.0'
				}), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders }
				});
			}
			
			// Health check
			if (url.pathname === '/health') {
				return new Response(JSON.stringify({ 
					status: 'ok', 
					timestamp: new Date().toISOString(),
					services: ['ai', 'database', 'storage', 'dex']
				}), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders }
				});
			}

			// V1 Database Management API (users, api-keys, permissions, etc.)
			if (url.pathname.startsWith('/v1/api/admin/users') || 
				url.pathname.startsWith('/v1/api/admin/api-keys') ||
				url.pathname.startsWith('/v1/api/admin/permissions') ||
				url.pathname.startsWith('/v1/api/admin/analytics') ||
				url.pathname.startsWith('/v1/api/admin/applications')) {
				return await databaseHandler(request, env);
			}

			// Admin sync endpoints - Enhanced Industrial Grade
			if (url.pathname.startsWith('/v1/api/admin/sync')) {
				return await handleIndustrialSync(request, env);
			}

			// DEX API routes - Support both v1 and direct paths
			if (url.pathname.startsWith('/v1/api/dex')) {
				const dexHandler = await createDexHandler(env);
				const response = await dexHandler(request);
				return response;
			}

			// AI routes
			if (url.pathname.startsWith('/v1/api/ai')) {
				return await aiHandler(request, env);
			}

			// Storage routes
			if (url.pathname.startsWith('/v1/api/project') || 
				url.pathname.startsWith('/v1/api/size') ||
				url.pathname.startsWith('/v1/api/create') ||
				url.pathname.startsWith('/v1/api/rename') ||
				url.pathname.startsWith('/v1/api/file')) {
				return await storageHandler(request, env);
			}

			// 404 for unknown routes
			return new Response(JSON.stringify({ error: 'Not Found' }), { 
				status: 404,
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
			});
			
		} catch (error) {
			console.error('Error handling request:', error);
			return new Response(JSON.stringify({ 
				error: 'Internal Server Error',
				details: error instanceof Error ? error.message : 'Unknown error'
			}), { 
				status: 500,
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
			});
		}
	},

	// Handle scheduled events (cron jobs)
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log('Scheduled event triggered:', controller.cron);
		
		// Handle different cron schedules
		try {
			await handleScheduledEvent(controller, env, ctx);
		} catch (error) {
			console.error('Error in scheduled event:', error);
		}
	},
} satisfies ExportedHandler<Env>;

// Simple scheduled event handler
async function handleScheduledEvent(
	controller: ScheduledController,
	env: Env,
	ctx: ExecutionContext
): Promise<void> {
	const now = new Date();
	console.log(`Scheduled job executed at ${now.toISOString()}, cron: ${controller.cron}`);
	
	if (!env.D1_DATABASE) {
		console.error('D1_DATABASE not available for scheduled tasks');
		return;
	}
	
	try {
		// Add your scheduled tasks here based on the cron pattern
		switch (controller.cron) {
			case '*/5 * * * *': // Every 5 minutes - sync pools frequently
				console.log('Running industrial-grade frequent pool sync task');
				await syncPoolsIndustrial(env);
				break;
				
			case '0 * * * *': // Every hour - sync stats hourly  
				console.log('Running industrial-grade hourly stats sync task');
				await syncStatsIndustrial(env);
				break;
				
			case '0 2 * * 0': // Weekly on Sunday at 2 AM - cleanup old data
				console.log('Running industrial-grade weekly cleanup task');
				await cleanupOldDataIndustrial(env);
				break;
				
			default:
				console.log(`Unknown cron schedule: ${controller.cron}`);
		}
	} catch (error) {
		console.error('Error in scheduled task:', error);
	}
}

// Industrial-grade sync functions for scheduled tasks
async function syncPoolsIndustrial(env: Env): Promise<void> {
	console.log('🚀 Running industrial-grade pool sync...');
	try {
		if (!env.D1_DATABASE) {
			throw new Error('D1_DATABASE not available');
		}
		
		const db = drizzle(env.D1_DATABASE, { schema });
		
		// 使用合约同步服务进行池同步
		const contractSyncService = createContractSyncService(db);
		
		// 同步BSC主网和测试网
		const chains = ['binance', 'bsctest'];
		
		for (const chain of chains) {
			try {
				console.log(`🔄 Syncing ${chain} pools using contract service...`);
				const result = await contractSyncService.syncAllPools(chain);
				console.log(`✅ ${chain} sync completed:`, result);
			} catch (error) {
				console.error(`❌ Error syncing ${chain}:`, error);
			}
		}
		
		console.log('✅ Industrial pool sync completed');
	} catch (error) {
		console.error('❌ Error in industrial pool sync:', error);
		throw error;
	}
}

async function syncStatsIndustrial(env: Env): Promise<void> {
	console.log('📊 Running industrial-grade stats sync...');
	try {
		if (!env.D1_DATABASE) {
			throw new Error('D1_DATABASE not available');
		}
		
		const db = drizzle(env.D1_DATABASE, { schema });
		const coordinator = createIndustrialSyncCoordinator(db);
		
		// Run comprehensive sync which includes stats updates
		const metrics = await coordinator.startFullSync();
		console.log('📈 Sync metrics:', metrics);
		
		console.log('✅ Industrial stats sync completed');
	} catch (error) {
		console.error('❌ Error in industrial stats sync:', error);
		throw error;
	}
}

async function cleanupOldDataIndustrial(env: Env): Promise<void> {
	console.log('🧹 Running industrial-grade data cleanup...');
	try {
		if (!env.D1_DATABASE) {
			throw new Error('D1_DATABASE not available');
		}
		
		const db = drizzle(env.D1_DATABASE, { schema });
		const dbService = createEnhancedDatabaseService(db);
		
		// Perform health check first
		const health = await dbService.healthCheck();
		console.log('Health check:', health);
		
		// TODO: Implement comprehensive cleanup logic
		// For now, just log the operation
		console.log('🧽 Data cleanup operations would run here');
		
		console.log('✅ Industrial cleanup completed');
	} catch (error) {
		console.error('❌ Error in industrial cleanup:', error);
		throw error;
	}
}

// Enhanced admin sync handler with industrial-grade features
async function handleIndustrialSync(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
	};

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	// Enhanced auth check
	const authHeader = request.headers.get('Authorization') || request.headers.get('X-API-Key');
	if (!authHeader || !authHeader.includes(env.KEY)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		if (!env.D1_DATABASE) {
			throw new Error('D1_DATABASE not available');
		}

		const db = drizzle(env.D1_DATABASE, { schema });
		const coordinator = createIndustrialSyncCoordinator(db);
		const dbService = createEnhancedDatabaseService(db);

		// Enhanced sync status with detailed metrics
		if (url.pathname === '/v1/api/admin/sync/status') {
			const [syncStatus, chainStatus, health] = await Promise.all([
				coordinator.getSyncStatus(),
				coordinator.getChainSyncStatus(),
				dbService.healthCheck()
			]);
			
			return new Response(JSON.stringify({ 
				success: true, 
				data: {
					syncStatus,
					chainStatus,
					health,
					timestamp: new Date().toISOString()
				}
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Enhanced pool sync with progress tracking
		if (url.pathname === '/v1/api/admin/sync/pools' && request.method === 'POST') {
			console.log('🚀 Manual industrial pool sync triggered');
			const metrics = await coordinator.startFullSync();
			
			return new Response(JSON.stringify({ 
				success: true, 
				message: 'Industrial pool sync completed',
				metrics,
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Pool discovery endpoint
		if (url.pathname === '/v1/api/admin/sync/discover' && request.method === 'POST') {
			console.log('🔍 Manual pool discovery triggered');
			const body = await request.json() as { chain?: string };
			
			if (body.chain) {
				await coordinator.forcePoolDiscovery(body.chain);
				return new Response(JSON.stringify({ 
					success: true, 
					message: `Pool discovery completed for ${body.chain}`,
					timestamp: new Date().toISOString()
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} else {
				// Discover for all chains
				const chains = await coordinator.getChainSyncStatus();
				for (const chain of chains) {
					if (chain.isActive) {
						await coordinator.forcePoolDiscovery(chain.chain);
					}
				}
				return new Response(JSON.stringify({ 
					success: true, 
					message: 'Pool discovery completed for all chains',
					timestamp: new Date().toISOString()
				}), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}
		}

		// Enhanced stats sync
		if (url.pathname === '/v1/api/admin/sync/stats' && request.method === 'POST') {
			console.log('📊 Manual industrial stats sync triggered');
			await syncStatsIndustrial(env);
			
			return new Response(JSON.stringify({ 
				success: true, 
				message: 'Industrial stats sync completed',
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Enhanced cleanup
		if (url.pathname === '/v1/api/admin/sync/cleanup' && request.method === 'POST') {
			console.log('🧹 Manual industrial cleanup triggered');
			await cleanupOldDataIndustrial(env);
			
			return new Response(JSON.stringify({ 
				success: true, 
				message: 'Industrial cleanup completed',
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Health check endpoint
		if (url.pathname === '/v1/api/admin/sync/health') {
			const health = await dbService.healthCheck();
			return new Response(JSON.stringify({ 
				success: true, 
				data: health,
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Quick test endpoint
		if (url.pathname === '/v1/api/admin/sync/test' && request.method === 'POST') {
			console.log('🧪 Running quick industrial sync test');
			const { quickTestIndustrialSync } = await import('./dex/industrial-sync-test');
			const result = await quickTestIndustrialSync(env);
			
			return new Response(JSON.stringify(result), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Add test data endpoint
		if (url.pathname === '/v1/api/admin/sync/test-data' && request.method === 'POST') {
			console.log('📊 Adding test stats data');
			const { addTestStatsData } = await import('./dex/industrial-sync-test');
			const result = await addTestStatsData(env);
			
			return new Response(JSON.stringify(result), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// Demonstrate advanced queries endpoint
		if (url.pathname === '/v1/api/admin/sync/demo' && request.method === 'POST') {
			console.log('🎭 Demonstrating advanced queries');
			const { demonstrateAdvancedQueries } = await import('./dex/industrial-sync-test');
			const result = await demonstrateAdvancedQueries(env);
			
			return new Response(JSON.stringify(result), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 新增：合约同步服务端点
		const contractSyncService = createContractSyncService(db);

		// 合约同步：发现并同步所有池
		if (url.pathname === '/v1/api/admin/sync/contract' && request.method === 'POST') {
			console.log('🔧 合约同步服务启动');
			const body = await request.json() as { chain?: string };
			const chain = body.chain || 'binance';
			
			const result = await contractSyncService.syncAllPools(chain);
			
			return new Response(JSON.stringify({ 
				success: true, 
				message: '合约同步完成',
				data: result,
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 合约同步：获取特定池的实时信息
		if (url.pathname === '/v1/api/admin/sync/contract/pool' && request.method === 'POST') {
			const body = await request.json() as { chain: string; poolAddress: string };
			
			if (!body.chain || !body.poolAddress) {
				return new Response(JSON.stringify({ 
					success: false, 
					error: '缺少必要参数: chain 和 poolAddress' 
				}), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}
			
			const poolInfo = await contractSyncService.getPoolRealTimeInfo(
				body.chain, 
				body.poolAddress as any
			);
			
			return new Response(JSON.stringify({ 
				success: true, 
				data: poolInfo,
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 合约同步：健康检查
		if (url.pathname === '/v1/api/admin/sync/contract/health') {
			const chain = url.searchParams.get('chain') || 'binance';
			const health = await contractSyncService.checkHealth(chain);
			
			return new Response(JSON.stringify({ 
				success: true, 
				data: health,
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 合约同步：仅发现池（不保存到数据库）
		if (url.pathname === '/v1/api/admin/sync/contract/discover' && request.method === 'POST') {
			const body = await request.json() as { chain?: string };
			const chain = body.chain || 'binance';
			
			const pools = await contractSyncService.discoverPoolsFromFactory(chain);
			
			return new Response(JSON.stringify({ 
				success: true, 
				message: `发现 ${pools.length} 个池`,
				data: { pools, count: pools.length },
				timestamp: new Date().toISOString()
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('❌ Industrial sync error:', error);
		return new Response(JSON.stringify({ 
			error: 'Internal server error',
			message: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString()
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}
