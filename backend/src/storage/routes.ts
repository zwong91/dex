import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAuthMiddleware } from '../middleware/auth';
import type { Env } from '../index';

// Storage request schemas
const createProjectSchema = z.object({
	name: z.string().min(1, 'Project name is required'),
	description: z.string().optional(),
	template: z.enum(['basic', 'dex', 'defi', 'nft', 'dao']).optional(),
});

const renameSchema = z.object({
	oldPath: z.string().min(1, 'Old path is required'),
	newPath: z.string().min(1, 'New path is required'),
});

const fileOperationSchema = z.object({
	path: z.string().min(1, 'File path is required'),
	content: z.string().optional(),
	operation: z.enum(['read', 'write', 'delete']).optional(),
});

export function createStorageRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	// Health check (no auth required)
	app.get('/health', (c) => {
		return c.json({
			status: 'healthy',
			service: 'storage',
			timestamp: new Date().toISOString(),
			r2_available: !!c.env.R2
		});
	});

	// Apply authentication middleware
	app.use('*', createAuthMiddleware());

	// Project operations
	app.post('/create',
		zValidator('json', createProjectSchema),
		async (c) => {
			try {
				const { name, description, template = 'basic' } = c.req.valid('json');
				
				if (!c.env.R2) {
					return c.json({
						error: 'Storage service not available',
						message: 'R2 storage is not configured in this environment',
						timestamp: new Date().toISOString()
					}, 503);
				}

				// Create project structure
				const projectId = generateProjectId();
				const user = c.get('user') as any;
				const projectPath = `projects/user-${user.id}/${projectId}`;
				
				// Create basic project files based on template
				const projectStructure = await createProjectStructure(template, name, description);
				
				// Store project files in R2
				for (const [filePath, content] of Object.entries(projectStructure)) {
					const fullPath = `${projectPath}/${filePath}`;
					await c.env.R2.put(fullPath, content, {
						httpMetadata: {
							contentType: getContentType(filePath),
						},
					});
				}

				return c.json({
					success: true,
					data: {
						projectId,
						name,
						template,
						path: projectPath,
						files: Object.keys(projectStructure),
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('Create project error:', error);
				return c.json({
					error: 'Project creation failed',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	// Get project list
	app.get('/project', async (c) => {
		try {
			if (!c.env.R2) {
				return c.json({
					error: 'Storage service not available',
					timestamp: new Date().toISOString()
				}, 503);
			}

			const user = c.get('user') as any;
			const userPrefix = `projects/user-${user.id}/`;
			
			const list = await c.env.R2.list({ prefix: userPrefix });
			
			// Group files by project
			const projects = new Map();
			for (const object of list.objects) {
				const pathParts = object.key.split('/');
				if (pathParts.length >= 3) {
					const projectId = pathParts[2];
					if (!projects.has(projectId)) {
						projects.set(projectId, {
							id: projectId,
							files: [],
							lastModified: object.uploaded,
							size: 0,
						});
					}
					const project = projects.get(projectId);
					project.files.push({
						path: pathParts.slice(3).join('/'),
						size: object.size,
						lastModified: object.uploaded,
					});
					project.size += object.size;
				}
			}

			return c.json({
				success: true,
				data: {
					projects: Array.from(projects.values()),
					total: projects.size,
				},
				timestamp: new Date().toISOString()
			});

		} catch (error) {
			console.error('Get projects error:', error);
			return c.json({
				error: 'Failed to fetch projects',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	});


	// 支持带或不带 projects/ 前缀的路径
	function parseProjectFilePath(path: string): { projectId: string, relativePath: string } {
		let parts = path.split('/');
		// 兼容前缀
		if (parts[0] === 'projects') {
			parts = parts.slice(1);
		}
		if (parts.length < 2) throw new Error('Invalid file path');
		const projectId = parts[0];
		const relativePath = parts.slice(1).join('/');
		return { projectId, relativePath };
	}

	// File operations
	app.get('/file/:path{.+}', async (c) => {
		try {
			const filePath = c.req.param('path');
			const user = c.get('user') as any;
			const { projectId, relativePath } = parseProjectFilePath(filePath);
			const fullR2Path = `projects/user-${user.id}/${projectId}/${relativePath}`;
			
			if (!c.env.R2) {
				return c.json({
					error: 'Storage service not available',
					timestamp: new Date().toISOString()
				}, 503);
			}

			const object = await c.env.R2.get(fullR2Path);
			
			if (!object) {
				return c.json({
					error: 'File not found',
					path: fullR2Path,
					timestamp: new Date().toISOString()
				}, 404);
			}

			const content = await object.text();
			
			return c.json({
				success: true,
				data: {
					path: filePath,
					content,
					size: object.size,
					lastModified: object.uploaded,
					contentType: object.httpMetadata?.contentType,
				},
				timestamp: new Date().toISOString()
			});

		} catch (error) {
			console.error('Read file error:', error);
			return c.json({
				error: 'Failed to read file',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	});

	// File write
	app.put('/file/:path{.+}',
		zValidator('json', z.object({
			content: z.string(),
		})),
		async (c) => {
			try {
				const filePath = c.req.param('path');
				const { content } = c.req.valid('json');
				const user = c.get('user') as any;
				const { projectId, relativePath } = parseProjectFilePath(filePath);
				const fullR2Path = `projects/user-${user.id}/${projectId}/${relativePath}`;
				
				if (!c.env.R2) {
					return c.json({
						error: 'Storage service not available',
						timestamp: new Date().toISOString()
					}, 503);
				}

				await c.env.R2.put(fullR2Path, content, {
					httpMetadata: {
						contentType: getContentType(relativePath),
					},
				});

				return c.json({
					success: true,
					data: {
						path: filePath,
						size: content.length,
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('Write file error:', error);
				return c.json({
					error: 'Failed to write file',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	// File rename
	app.post('/rename',
		zValidator('json', renameSchema),
		async (c) => {
			try {
				const { oldPath, newPath } = c.req.valid('json');
				const user = c.get('user') as any;
				const { projectId: oldProjectId, relativePath: oldRel } = parseProjectFilePath(oldPath);
				const { projectId: newProjectId, relativePath: newRel } = parseProjectFilePath(newPath);
				const fullOldPath = `projects/user-${user.id}/${oldProjectId}/${oldRel}`;
				const fullNewPath = `projects/user-${user.id}/${newProjectId}/${newRel}`;
				
				if (!c.env.R2) {
					return c.json({
						error: 'Storage service not available',
						timestamp: new Date().toISOString()
					}, 503);
				}

				// Get the old file
				const oldObject = await c.env.R2.get(fullOldPath);
				if (!oldObject) {
					return c.json({
						error: 'Source file not found',
						path: oldPath,
						timestamp: new Date().toISOString()
					}, 404);
				}

				// Copy to new location
				const content = await oldObject.text();
				await c.env.R2.put(fullNewPath, content, {
					httpMetadata: {
						contentType: getContentType(newRel),
					},
				});

				// Delete old file
				await c.env.R2.delete(fullOldPath);

				return c.json({
					success: true,
					data: {
						oldPath,
						newPath,
						size: content.length,
					},
					timestamp: new Date().toISOString()
				});

			} catch (error) {
				console.error('Rename file error:', error);
				return c.json({
					error: 'Failed to rename file',
					message: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}, 500);
			}
		}
	);

	// Get storage size
	app.get('/size', async (c) => {
		try {
			if (!c.env.R2) {
				return c.json({
					error: 'Storage service not available',
					timestamp: new Date().toISOString()
				}, 503);
			}

			const user = c.get('user') as any;
			const userPrefix = `projects/user-${user.id}/`;
			
			const list = await c.env.R2.list({ prefix: userPrefix });
			
			let totalSize = 0;
			let fileCount = 0;
			
			for (const object of list.objects) {
				totalSize += object.size;
				fileCount++;
			}

			return c.json({
				success: true,
				data: {
					totalSize,
					fileCount,
					formattedSize: formatBytes(totalSize),
				},
				timestamp: new Date().toISOString()
			});

		} catch (error) {
			console.error('Get storage size error:', error);
			return c.json({
				error: 'Failed to get storage size',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}, 500);
		}
	});

	return app;
}

// Helper functions
function generateProjectId(): string {
	return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getContentType(filePath: string): string {
	const ext = filePath.split('.').pop()?.toLowerCase();
	const contentTypes: Record<string, string> = {
		'js': 'application/javascript',
		'ts': 'application/typescript',
		'json': 'application/json',
		'html': 'text/html',
		'css': 'text/css',
		'md': 'text/markdown',
		'txt': 'text/plain',
		'sol': 'text/plain',
		'py': 'text/x-python',
	};
	return contentTypes[ext || ''] || 'text/plain';
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function createProjectStructure(template: string, name: string, description?: string): Promise<Record<string, string>> {
	const structure: Record<string, string> = {};
	
	// Common files
	structure['README.md'] = `# ${name}\n\n${description || 'A new blockchain project'}\n\n## Getting Started\n\nThis project was created using the EntYSquare platform.\n`;
	structure['package.json'] = JSON.stringify({
		name: name.toLowerCase().replace(/\s+/g, '-'),
		version: '1.0.0',
		description: description || 'A blockchain project',
		main: 'index.ts',
		scripts: {
			test: 'echo "Error: no test specified" && exit 1'
		},
		keywords: ['blockchain', 'web3', 'dex'],
		author: '',
		license: 'MIT'
	}, null, 2);

	// Template-specific files
	switch (template) {
		case 'dex':
			structure['contracts/DEX.sol'] = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract DEX {\n    // DEX implementation\n}\n`;
			structure['src/index.ts'] = `// DEX frontend implementation\nconsole.log('DEX started');\n`;
			break;
		case 'defi':
			structure['contracts/DeFiProtocol.sol'] = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract DeFiProtocol {\n    // DeFi protocol implementation\n}\n`;
			break;
		case 'nft':
			structure['contracts/NFT.sol'] = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\nimport "@openzeppelin/contracts/token/ERC721/ERC721.sol";\n\ncontract NFT is ERC721 {\n    constructor() ERC721("MyNFT", "MNFT") {}\n}\n`;
			break;
		default:
			structure['src/index.ts'] = `console.log('Hello, ${name}!');\n`;
	}

	return structure;
}
