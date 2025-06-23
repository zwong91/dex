import { Router } from 'itty-router';
import { json } from 'itty-router-extras';
import { aiHandler } from './ai/handler';
import { storageHandler } from './storage/handler';
import { createDexHandler } from './dex/handler';
import { databaseHandler } from './database/handler';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './database/schema';

export interface Env {
	AI?: any;
	DB?: D1Database;
	D1_DATABASE?: D1Database; // For DEX database
	R2?: R2Bucket;
	KEY: string;
	NODE_ENV?: string;
	// RPC URLs
	BSC_INFURA_URL?: string;
	BSC_TEST_INFURA_URL?: string;
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

			// Admin sync endpoints
			if (url.pathname.startsWith('/v1/api/admin/sync')) {
				const { handleSync } = await import('./dex/sync/sync-handler');
				return await handleSync(request, env);
			}

			// Cron management endpoints
			if (url.pathname.startsWith('/v1/api/admin/cron')) {
				const { handleSimpleCronManagement } = await import('./dex/sync/simple-cron-management');
				return await handleSimpleCronManagement(request, env);
			}

			// Simple test endpoints for debugging
			if (url.pathname.startsWith('/v1/api/test/simple')) {
				const { handleSimpleTest } = await import('./dex/sync/simple-test');
				return await handleSimpleTest(request, env);
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

	/**
	 * 处理 Cloudflare Worker Cron 触发器
	 * 根据 wrangler.toml 中定义的 cron 调度执行不同的同步任务
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const cronTimestamp = new Date(controller.scheduledTime).toISOString();
		
		console.log(`🕐 Cron job triggered: ${controller.cron} at ${cronTimestamp}`);

		try {
			// 动态导入 Cron 处理器
			const { CronHandler } = await import('./dex/sync/cron-handler');
			const cronHandler = new CronHandler(env);

			// 根据 cron 表达式执行相应的任务
			switch (controller.cron) {
				case "*/1 * * * *": // sync-pools-frequent - 每1分钟
					await cronHandler.handleFrequentPoolSync();
					break;

				case "0 * * * *": // sync-stats-hourly - 每小时
					await cronHandler.handleHourlyStatsSync();
					break;

				case "0 2 * * 0": // cleanup-old-data - 每周日凌晨2点
					await cronHandler.handleWeeklyCleanup();
					break;

				default:
					console.warn(`⚠️ Unknown cron pattern: ${controller.cron}`);
					break;
			}

		} catch (error) {
			console.error(`❌ Cron job failed for pattern ${controller.cron}:`, error);
			
			// 可以在这里添加错误通知逻辑
			// 例如发送到监控系统或错误追踪服务
			
			// 重新抛出错误以便 Cloudflare 知道任务失败
			throw error;
		}
	},

} satisfies ExportedHandler<Env>;

