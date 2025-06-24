import { Router } from 'itty-router';
import { json } from 'itty-router-extras';
import { aiHandler } from './ai/handler';
import { storageHandler } from './storage/handler';
import { createDexHandler } from './dex/handler';

export interface Env {
	AI?: any;
	R2?: R2Bucket;
	KEY: string;
	NODE_ENV?: string;
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
					services: ['ai', 'storage', 'dex-graphql'],
					architecture: 'pure-graphql'
				}), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders }
				});
			}

			// DEX API routes - Pure GraphQL implementation
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
	 * 纯GraphQL架构下的轻量级任务调度
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const cronTimestamp = new Date(controller.scheduledTime).toISOString();
		
		console.log(`🕐 Cron job triggered: ${controller.cron} at ${cronTimestamp}`);

		try {
			// 纯GraphQL架构下的轻量级任务
			switch (controller.cron) {
				case "*/5 * * * *": // health-check - 每5分钟检查subgraph健康状态
					console.log("🏥 Running subgraph health check...");
					// 可以在这里添加subgraph健康监控
					break;

				case "0 * * * *": // metrics-collection - 每小时收集指标
					console.log("📊 Collecting GraphQL metrics...");
					// 可以在这里添加API使用统计收集
					break;

				case "0 2 * * 0": // log-cleanup - 每周日凌晨2点清理日志
					console.log("🧹 Running log cleanup...");
					// 可以在这里添加日志清理逻辑
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

