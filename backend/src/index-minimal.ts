// Minimal test index to debug the hanging issue
export interface Env {
	AI?: any;
	DB?: D1Database;
	D1_DATABASE?: D1Database;
	R2?: R2Bucket;
	KEY: string;
	NODE_ENV?: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		console.log('=== MINIMAL TEST HANDLER ===');
		console.log('Request:', request.method, new URL(request.url).pathname);
		
		try {
			const url = new URL(request.url);
			
			if (url.pathname === '/') {
				return new Response(JSON.stringify({
					message: 'Minimal test working',
					status: 'ok',
					timestamp: new Date().toISOString()
				}), {
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			if (url.pathname === '/test') {
				return new Response(JSON.stringify({
					message: 'Test endpoint working',
					environment: env.NODE_ENV,
					database: env.D1_DATABASE ? 'available' : 'missing'
				}), {
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			return new Response('Not Found', { status: 404 });
			
		} catch (error) {
			console.error('Error in minimal handler:', error);
			return new Response(JSON.stringify({
				error: 'Internal Server Error',
				details: error instanceof Error ? error.message : 'Unknown error'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}
};
