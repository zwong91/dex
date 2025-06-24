import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAuthMiddleware } from '../dex/middleware/auth';
import type { Env } from '../index';

// AI request schemas
const aiRequestSchema = z.object({
	prompt: z.string().min(1, 'Prompt is required'),
	context: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().min(1).max(4000).optional(),
});

const codeAnalysisSchema = z.object({
	code: z.string().min(1, 'Code is required'),
	language: z.string().optional(),
	analysisType: z.enum(['security', 'performance', 'style', 'bugs']).optional(),
});

export function createAIRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	// Health check (no auth required)
	app.get('/health', (c) => {
		return c.json({
			status: 'healthy',
			service: 'ai',
			timestamp: new Date().toISOString(),
			ai_available: !!c.env.AI
		});
	});

	// Apply authentication middleware
	app.use('*', createAuthMiddleware());

	// AI chat completion
	app.post('/chat', 
		zValidator('json', aiRequestSchema),
		async (c) => {
			try {
				const { prompt, context, temperature = 0.7, maxTokens = 1000 } = c.req.valid('json');
				
				if (!c.env.AI) {
					return c.json({
						error: 'AI service not available',
						message: 'AI service is not configured in this environment',
						timestamp: new Date().toISOString()
					}, 503);
				}

				// Call Cloudflare AI
				const messages = [
					{ role: "system", content: context || "You are a helpful assistant for DeFi and blockchain applications." },
					{ role: "user", content: prompt }
				];

				const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
					messages,
					max_tokens: maxTokens,
					temperature
				});

				return c.json({
					success: true,
					data: {
						response: response.response,
						usage: {
							prompt_tokens: prompt.length,
							completion_tokens: response.response?.length || 0,
							total_tokens: prompt.length + (response.response?.length || 0)
						}
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('AI chat error:', error);
				return c.json({
					error: 'AI processing failed',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	// Code analysis
	app.post('/analyze-code',
		zValidator('json', codeAnalysisSchema),
		async (c) => {
			try {
				const { code, language = 'typescript', analysisType = 'security' } = c.req.valid('json');
				
				if (!c.env.AI) {
					return c.json({
						error: 'AI service not available',
						timestamp: new Date().toISOString()
					}, 503);
				}

				const analysisPrompts = {
					security: `Analyze this ${language} code for security vulnerabilities and provide recommendations:`,
					performance: `Analyze this ${language} code for performance issues and optimization opportunities:`,
					style: `Review this ${language} code for style and best practices:`,
					bugs: `Find potential bugs and issues in this ${language} code:`
				};

				const prompt = `${analysisPrompts[analysisType]}\n\n\`\`\`${language}\n${code}\n\`\`\``;

				const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
					messages: [
						{ role: "system", content: "You are an expert code reviewer with deep knowledge of blockchain and DeFi development." },
						{ role: "user", content: prompt }
					],
					max_tokens: 2000,
					temperature: 0.3
				});

				return c.json({
					success: true,
					data: {
						analysis: response.response,
						analysisType,
						language,
						codeLength: code.length
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('Code analysis error:', error);
				return c.json({
					error: 'Code analysis failed',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	// Smart contract analysis
	app.post('/analyze-contract',
		zValidator('json', z.object({
			contractCode: z.string().min(1, 'Contract code is required'),
			contractType: z.enum(['ERC20', 'ERC721', 'DEX', 'DeFi', 'other']).optional(),
		})),
		async (c) => {
			try {
				const { contractCode, contractType = 'other' } = c.req.valid('json');
				
				if (!c.env.AI) {
					return c.json({
						error: 'AI service not available',
						timestamp: new Date().toISOString()
					}, 503);
				}

				const prompt = `Analyze this ${contractType} smart contract for security vulnerabilities, gas optimization opportunities, and best practices:\n\n\`\`\`solidity\n${contractCode}\n\`\`\``;

				const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
					messages: [
						{ role: "system", content: "You are a smart contract security expert specializing in Solidity and DeFi protocols." },
						{ role: "user", content: prompt }
					],
					max_tokens: 3000,
					temperature: 0.2
				});

				return c.json({
					success: true,
					data: {
						analysis: response.response,
						contractType,
						codeLength: contractCode.length,
						recommendations: [], // Could parse AI response for structured recommendations
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('Contract analysis error:', error);
				return c.json({
					error: 'Contract analysis failed',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	// DeFi strategy suggestions
	app.post('/suggest-strategy',
		zValidator('json', z.object({
			userProfile: z.object({
				riskTolerance: z.enum(['low', 'medium', 'high']),
				investmentAmount: z.number().positive(),
				timeHorizon: z.enum(['short', 'medium', 'long']),
				preferredAssets: z.array(z.string()).optional(),
			}),
			marketConditions: z.object({
				volatility: z.enum(['low', 'medium', 'high']).optional(),
				trend: z.enum(['bullish', 'bearish', 'sideways']).optional(),
			}).optional(),
		})),
		async (c) => {
			try {
				const { userProfile, marketConditions } = c.req.valid('json');
				
				if (!c.env.AI) {
					return c.json({
						error: 'AI service not available',
						timestamp: new Date().toISOString()
					}, 503);
				}

				const prompt = `Suggest DeFi investment strategies for a user with the following profile:
- Risk Tolerance: ${userProfile.riskTolerance}
- Investment Amount: $${userProfile.investmentAmount}
- Time Horizon: ${userProfile.timeHorizon}
- Preferred Assets: ${userProfile.preferredAssets?.join(', ') || 'Any'}
${marketConditions ? `- Market Volatility: ${marketConditions.volatility}
- Market Trend: ${marketConditions.trend}` : ''}

Provide specific, actionable DeFi strategies with risk assessments.`;

				const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
					messages: [
						{ role: "system", content: "You are a DeFi investment advisor with expertise in yield farming, liquidity provision, and risk management." },
						{ role: "user", content: prompt }
					],
					max_tokens: 2500,
					temperature: 0.5
				});

				return c.json({
					success: true,
					data: {
						strategies: response.response,
						userProfile,
						marketConditions,
						disclaimer: "This is AI-generated advice and should not be considered financial advice. Always do your own research."
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('Strategy suggestion error:', error);
				return c.json({
					error: 'Strategy suggestion failed',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	return app;
}
