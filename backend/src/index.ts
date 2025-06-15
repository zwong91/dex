import { Router } from 'itty-router';
import { json } from 'itty-router-extras';
import { Hono } from 'hono';
import { aiHandler } from './ai/handler';
import { databaseHandler } from './database/handler';
import { storageHandler } from './storage/handler';
import { createDexHandler } from './dex/handler';

export interface Env {
	AI?: any;
	DB?: D1Database;
	R2?: R2Bucket;
	KEY: string;
}

const router = Router();

// Create Hono app for DEX API
const dexApp = createDexHandler();

// AI routes
router.get('/api/ai', aiHandler);

// Database routes  
router.all('/api/sandbox*', databaseHandler);
router.all('/api/user*', databaseHandler);

// Storage routes
router.all('/api/project', storageHandler);
router.all('/api/size', storageHandler);
router.all('/api/create', storageHandler);
router.all('/api/rename', storageHandler);
router.all('/api/file', storageHandler);

// DEX API routes - delegate to Hono app
router.all('/api/dex/*', async (request: Request, env: Env, ctx: ExecutionContext) => {
	// Remove /api/dex prefix for Hono routing
	const url = new URL(request.url);
	const newPath = url.pathname.replace('/api/dex', '');
	const newUrl = new URL(newPath || '/', url.origin);
	newUrl.search = url.search;
	
	const newRequest = new Request(newUrl, {
		method: request.method,
		headers: request.headers,
		body: request.body,
	});
	
	return dexApp.fetch(newRequest, env, ctx);
});

// Health check
router.get('/health', () => json({ 
	status: 'ok', 
	timestamp: new Date().toISOString(),
	services: ['ai', 'database', 'storage', 'dex']
}));

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		// CORS handling
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}

		try {
			const response = await router.handle(request, env, ctx);
			
			// Add CORS headers to response
			const corsHeaders = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			};

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: { ...response.headers, ...corsHeaders },
			});
		} catch (error) {
			console.error('Error handling request:', error);
			return json({ error: 'Internal Server Error' }, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
