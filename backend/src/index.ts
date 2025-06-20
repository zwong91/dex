import { Router } from 'itty-router';
import { json } from 'itty-router-extras';
import { aiHandler } from './ai/handler';
import { storageHandler } from './storage/handler';
import { createSimpleTestHandler } from './dex/simple-test-handler';
import { createDexHandler } from './dex/handler';
import { databaseHandler } from './database/handler';

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

			// V2 Database Management API (users, api-keys, permissions, etc.)
			if (url.pathname.startsWith('/api/v2/admin/users') || 
				url.pathname.startsWith('/api/v2/admin/api-keys') ||
				url.pathname.startsWith('/api/v2/admin/permissions') ||
				url.pathname.startsWith('/api/v2/admin/analytics') ||
				url.pathname.startsWith('/api/v2/admin/applications')) {
				return await databaseHandler(request, env);
			}

			// DEX API routes
			if (url.pathname.startsWith('/api/dex/')) {
				const dexHandler = await createDexHandler(env);
				const response = await dexHandler(request);
				return response;
			}

			// Test routes
			if (url.pathname.startsWith('/test/')) {
				const testHandler = await createSimpleTestHandler(env);
				const response = await testHandler(request);
				return response;
			}

			// AI routes
			if (url.pathname.startsWith('/api/ai')) {
				return await aiHandler(request, env);
			}

			// Storage routes
			if (url.pathname.startsWith('/api/project') || 
				url.pathname.startsWith('/api/size') ||
				url.pathname.startsWith('/api/create') ||
				url.pathname.startsWith('/api/rename') ||
				url.pathname.startsWith('/api/file')) {
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
	// Scheduled handler - disabled for now
	// async scheduled(
	// 	event: ScheduledEvent,
	// 	env: Env,
	// 	ctx: ExecutionContext
	// ): Promise<void> {
	// 	console.log('Scheduled event triggered:', event.cron);
		
	// 	// Handle different cron schedules
	// 	try {
	// 		await handleScheduledEvent(event, env, ctx);
	// 	} catch (error) {
	// 		console.error('Error in scheduled event:', error);
	// 	}
	// },
} satisfies ExportedHandler<Env>;
