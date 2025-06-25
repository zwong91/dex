import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';
import { createAIRoutes } from './ai/routes';
import { createStorageRoutes } from './storage/routes';
import { createDexRoutes } from './dex/routes';

export interface Env {
	AI?: any;
	R2?: R2Bucket;
	KEY: string;
	NODE_ENV?: string;
	// GraphQL configuration  
	SUBGRAPH_URL?: string;
}

// Create main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', timing());
app.use('*', prettyJSON());
app.use('*', cors({
	origin: '*',
	allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Root endpoint
app.get('/', (c) => {
	return c.json({
		message: 'DEX Backend API - Powered by Hono',
		status: 'ok',
		timestamp: new Date().toISOString(),
		version: '2.0.0',
		framework: 'hono',
		architecture: 'pure-graphql'
	});
});

// Health check endpoint  
app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		services: ['ai', 'storage', 'dex-graphql'],
		architecture: 'pure-graphql',
		framework: 'hono'
	});
});

// Mount route modules using unified routes
app.route('/v1/api/dex', createDexRoutes());
app.route('/v1/api/ai', createAIRoutes());
app.route('/v1/api/storage', createStorageRoutes());

// 404 handler
app.notFound((c) => {
	return c.json({ 
		error: 'Not Found',
		message: `Route ${c.req.method} ${c.req.path} not found`,
		timestamp: new Date().toISOString()
	}, 404);
});

// Error handler
app.onError((err, c) => {
	console.error('Unhandled error:', err);
	return c.json({
		error: 'Internal Server Error',
		message: err.message,
		timestamp: new Date().toISOString()
	}, 500);
});

// Export the app as default for Cloudflare Workers
export default {
	fetch: app.fetch,
	
	/**
	 * Handle Cloudflare Worker Cron triggers
	 * Lightweight task scheduling for pure GraphQL architecture
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const cronTimestamp = new Date(controller.scheduledTime).toISOString();
		
		console.log(`🕐 Cron job triggered: ${controller.cron} at ${cronTimestamp}`);

		try {
			// Lightweight tasks for pure GraphQL architecture
			switch (controller.cron) {
				case "*/5 * * * *": // health-check - Check subgraph health every 5 minutes
					console.log("🏥 Running subgraph health check...");
					// Add subgraph health monitoring here
					break;

				case "0 * * * *": // metrics-collection - Collect metrics hourly
					console.log("📊 Collecting GraphQL metrics...");
					// Add API usage statistics collection here
					break;

				case "0 2 * * 0": // log-cleanup - Clean logs every Sunday at 2am
					console.log("🧹 Running log cleanup...");
					// Add log cleanup logic here
					break;

				default:
					console.warn(`⚠️ Unknown cron pattern: ${controller.cron}`);
					break;
			}

		} catch (error) {
			console.error(`❌ Cron job failed for pattern ${controller.cron}:`, error);
			throw error;
		}
	},
} satisfies ExportedHandler<Env>;

