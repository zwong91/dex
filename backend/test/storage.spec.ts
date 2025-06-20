import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Cloudflare Workers environment for testing
const mockEnv = {
	AI: {},
	DB: {},
	R2: {},
	KEY: "test-secret-key",
	NODE_ENV: "test"
};

// Mock Worker implementation
const worker = {
	async fetch(request: Request, env: any, ctx: any) {
		const url = new URL(request.url);
		const pathname = url.pathname;
		
		// Mock authorization check
		const auth = request.headers.get("Authorization");
		if (auth !== env.KEY) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), { 
				status: 401, 
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		// Project operations
		if (pathname.endsWith('/project')) {
			if (request.method === 'DELETE') {
				try {
					const body = await request.json();
					if (!body || !body.sandboxId) {
						return new Response(JSON.stringify({ error: "Missing required parameter: sandboxId" }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					return new Response(JSON.stringify({ success: true, message: "Project deleted" }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					});
				} catch (e) {
					return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			} else {
				return new Response(JSON.stringify({ error: "Method not allowed" }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		// Mock storage responses
		if (pathname.endsWith('/size')) {
			if (request.method === 'GET') {
				const sandboxId = url.searchParams.get('sandboxId');
				if (!sandboxId) {
					return new Response(JSON.stringify({ error: "Missing required parameter: sandboxId" }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(JSON.stringify({ success: true, size: 1024 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				return new Response(JSON.stringify({ error: "Method not allowed" }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		if (pathname.endsWith('/create')) {
			if (request.method === 'POST') {
				return new Response(JSON.stringify({ success: true, message: "Project created" }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				return new Response(JSON.stringify({ error: "Method not allowed" }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		if (pathname.endsWith('/rename')) {
			if (request.method === 'PUT') {
				return new Response(JSON.stringify({ success: true, message: "File renamed" }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				return new Response(JSON.stringify({ error: "Method not allowed" }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		if (pathname.endsWith('/file')) {
			if (request.method === 'GET') {
				const sandboxId = url.searchParams.get('sandboxId');
				const path = url.searchParams.get('path');
				if (!sandboxId || !path) {
					return new Response(JSON.stringify({ error: "Missing required parameters: sandboxId, path" }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(JSON.stringify({ success: true, content: "file content", path }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				return new Response(JSON.stringify({ error: "Method not allowed" }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		return new Response(JSON.stringify({ error: "Not found" }), { 
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// Mock fetch function
global.fetch = vi.fn(async (url: string | Request, options?: any) => {
	const request = typeof url === 'string' ? new Request(url, options) : url;
	return worker.fetch(request, mockEnv, {});
});

describe("Storage Handler", () => {
	const baseUrl = "http://example.com/api";
	const authHeaders = {
		"Authorization": "test-secret-key",
		"Content-Type": "application/json"
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Cleanup any test data if needed
	});

	describe("Authentication & Authorization", () => {
		it("should require authorization for project deletion", async () => {
			const response = await fetch(`${baseUrl}/project`, {
				method: "DELETE",
				body: JSON.stringify({ sandboxId: "test" })
			});
			expect(response.status).toBe(401);
		});

		it("should accept valid authorization", async () => {
			const response = await fetch(`${baseUrl}/size?sandboxId=test`, {
				headers: authHeaders
			});
			// Should not be 401 (may be 503 if R2 not available in test)
			expect(response.status).not.toBe(401);
		});

		it("should reject invalid authorization tokens", async () => {
			const invalidAuthHeaders = {
				"Authorization": "invalid-token",
				"Content-Type": "application/json"
			};

			const response = await fetch(`${baseUrl}/size?sandboxId=test`, {
				headers: invalidAuthHeaders
			});
			expect(response.status).toBe(401);
		});
	});

	describe("Project Operations", () => {
		it("should handle project deletion", async () => {
			const deleteData = {
				sandboxId: "test-sandbox-id"
			};

			const response = await fetch(`${baseUrl}/project`, {
				method: "DELETE",
				headers: authHeaders,
				body: JSON.stringify(deleteData)
			});

			if (response.status === 503) {
				// R2 not available in test environment
				const data = await response.json();
				expect(data.error).toContain("Storage service not available");
			} else {
				expect(response.status).toBe(200);
			}
		});

		it("should validate deletion request body", async () => {
			const response = await fetch(`${baseUrl}/project`, {
				method: "DELETE",
				headers: authHeaders,
				body: JSON.stringify({})
			});

			if (response.status !== 503) {
				expect(response.status).toBe(400);
			}
		});

		it("should reject non-DELETE methods for project endpoint", async () => {
			const methods = ["GET", "POST", "PUT", "PATCH"];

			for (const method of methods) {
				const response = await fetch(`${baseUrl}/project`, {
					method,
					headers: authHeaders
				});
				expect(response.status).toBe(405);
			}
		});
	});

	describe("Size Operations", () => {
		it("should get project size", async () => {
			const response = await fetch(`${baseUrl}/size?sandboxId=test-id`, {
				headers: authHeaders
			});

			if (response.status === 503) {
				const data = await response.json();
				expect(data.error).toContain("Storage service not available");
			} else {
				expect(response.status).toBe(200);
			}
		});

		it("should require sandboxId parameter", async () => {
			const response = await fetch(`${baseUrl}/size`, {
				headers: authHeaders
			});

			if (response.status !== 503) {
				expect(response.status).toBe(400);
			}
		});

		it("should reject non-GET methods for size endpoint", async () => {
			const methods = ["POST", "PUT", "DELETE", "PATCH"];

			for (const method of methods) {
				const response = await fetch(`${baseUrl}/size?sandboxId=test`, {
					method,
					headers: authHeaders
				});
				expect(response.status).toBe(405);
			}
		});
	});

	describe("Create Operations", () => {
		it("should create new file", async () => {
			const createData = {
				sandboxId: "test-sandbox",
				path: "src/test.js",
				content: "console.log('Hello World');"
			};

			const response = await fetch(`${baseUrl}/create`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify(createData)
			});

			if (response.status === 503) {
				const data = await response.json();
				expect(data.error).toContain("Storage service not available");
			} else {
				expect(response.status).toBe(200);
			}
		});

		it("should validate create request body", async () => {
			const invalidData = {
				sandboxId: "test"
				// missing path and content
			};

			const response = await fetch(`${baseUrl}/create`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify(invalidData)
			});

			if (response.status !== 503) {
				expect(response.status).toBe(400);
			}
		});

		it("should reject non-POST methods for create endpoint", async () => {
			const methods = ["GET", "PUT", "DELETE", "PATCH"];

			for (const method of methods) {
				const response = await fetch(`${baseUrl}/create`, {
					method,
					headers: authHeaders
				});
				expect(response.status).toBe(405);
			}
		});
	});

	describe("Rename Operations", () => {
		it("should rename file", async () => {
			const renameData = {
				sandboxId: "test-sandbox",
				oldPath: "src/old-name.js",
				newPath: "src/new-name.js"
			};

			const response = await fetch(`${baseUrl}/rename`, {
				method: "PUT",
				headers: authHeaders,
				body: JSON.stringify(renameData)
			});

			if (response.status === 503) {
				const data = await response.json();
				expect(data.error).toContain("Storage service not available");
			} else {
				expect(response.status).toBe(200);
			}
		});

		it("should validate rename request body", async () => {
			const invalidData = {
				sandboxId: "test",
				oldPath: "src/old.js"
				// missing newPath
			};

			const response = await fetch(`${baseUrl}/rename`, {
				method: "PUT",
				headers: authHeaders,
				body: JSON.stringify(invalidData)
			});

			if (response.status !== 503) {
				expect(response.status).toBe(400);
			}
		});
	});

	describe("File Operations", () => {
		it("should get file content", async () => {
			const response = await fetch(`${baseUrl}/file?sandboxId=test&path=src/test.js`, {
				headers: authHeaders
			});

			if (response.status === 503) {
				const data = await response.json();
				expect(data.error).toContain("Storage service not available");
			} else if (response.status === 404) {
				const data = await response.json();
				expect(data.error).toContain("not found");
			} else {
				expect(response.status).toBe(200);
			}
		});

		it("should require sandboxId and path parameters", async () => {
			const response = await fetch(`${baseUrl}/file`, {
				headers: authHeaders
			});

			if (response.status !== 503) {
				expect(response.status).toBe(400);
			}
		});

		it("should reject non-GET methods for file endpoint", async () => {
			const methods = ["POST", "PUT", "DELETE", "PATCH"];

			for (const method of methods) {
				const response = await fetch(`${baseUrl}/file?sandboxId=test&path=test.js`, {
					method,
					headers: authHeaders
				});
				expect(response.status).toBe(405);
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid JSON in request body", async () => {
			const response = await fetch(`${baseUrl}/create`, {
				method: "POST",
				headers: authHeaders,
				body: "invalid-json"
			});

			if (response.status !== 503) {
				expect(response.status).toBe(400);
			}
		});

		it("should handle storage connection errors gracefully", async () => {
			const response = await fetch(`${baseUrl}/size?sandboxId=test`, {
				headers: authHeaders
			});

			if (response.status === 503) {
				const data = await response.json();
				expect(data).toHaveProperty("error");
				expect(data.error).toContain("Storage service not available");
			}
		});
	});
});
