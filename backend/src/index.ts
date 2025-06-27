import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';
import { createDexRoutes } from './dex/routes';
import { D1Agent } from './mcp/routes';
import { createAIRoutes } from './ai/routes';
import { createStorageRoutes } from './storage/routes';
import { createDBRoutes } from './database/routes';

export interface Env {
	AI?: Ai;
	D1_DATABASE?: D1Database;
	R2?: R2Bucket;
	KEY: string;
	NODE_ENV?: string;
	// GraphQL configuration  
	SUBGRAPH_URL?: string;
}

// Export Durable Objects for wrangler
export { D1Agent } from './mcp/routes';

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
		services: ['ai', 'd1', 'r2', 'dex-graphql'],
		architecture: 'pure-graphql',
		framework: 'hono'
	});
});

// Mount route modules using unified routes
app.route('/v1/api/dex', createDexRoutes());

// MCP Agent routes - handle SSE and MCP requests
// SSE endpoint - support both GET and POST
app.get("/sse", async (c) => {
  try {
    console.log('SSE GET request received');
    // Create a new request with the correct path that D1Agent expects
    const request = new Request(c.req.url.toString(), {
      method: c.req.method,
      headers: c.req.header(),
    });
    return D1Agent.serveSSE("/sse").fetch(request, c.env, c.executionCtx);
  } catch (error) {
    console.error('SSE GET error:', error);
    return c.json({ error: 'SSE connection failed', message: error.message }, 500);
  }
});

app.post("/sse", async (c) => {
  try {
    console.log('SSE POST request received');
    return D1Agent.serveSSE("/sse").fetch(c.req.raw, c.env, c.executionCtx);
  } catch (error) {
    console.error('SSE POST error:', error);
    return c.json({ error: 'SSE connection failed', message: error.message }, 500);
  }
});

// SSE message endpoint
app.post("/sse/message", async (c) => {
  try {
    console.log('SSE message request received');
    return D1Agent.serveSSE("/sse").fetch(c.req.raw, c.env, c.executionCtx);
  } catch (error) {
    console.error('SSE message error:', error);
    return c.json({ error: 'SSE message failed', message: error.message }, 500);
  }
});

// MCP endpoint
app.post("/mcp", async (c) => {
  try {
    console.log('MCP request received');
    return D1Agent.serve("/mcp").fetch(c.req.raw, c.env, c.executionCtx);
  } catch (error) {
    console.error('MCP error:', error);
    return c.json({ error: 'MCP request failed', message: error.message }, 500);
  }
});

// Debug endpoint to check if D1Agent is working
app.get("/debug", async (c) => {
  return c.json({
    message: 'MCP Agent debug endpoint',
    timestamp: new Date().toISOString(),
    agent: 'D1Agent',
    availableMethods: ['serveSSE', 'serve']
  });
});

// Create routes for AI, D1, and R2
// These routes are designed to be used with the Model Context Protocol (MCP)
// and provide a unified interface for AI, database, and storage operations.
app.route('/v1/api/ai', createAIRoutes());
app.route('/v1/api/d1', createDBRoutes());
app.route('/v1/api/r2', createStorageRoutes());

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
					break;

				case "0 * * * *": // metrics-collection - Collect metrics hourly
					console.log("📊 Collecting GraphQL metrics...");
					break;

				case "0 2 * * 0": // log-cleanup - Clean logs every Sunday at 2am
					console.log("🧹 Running log cleanup...");
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

