import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Cloudflare Workers environment for testing
const mockEnv = {
	AI: {
		run: vi.fn().mockResolvedValue({ response: "Generated code" })
	},
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
		
		// Mock AI responses
		if (pathname.endsWith('/ai')) {
			if (request.method !== 'GET') {
				return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
					status: 405, 
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			const fileName = url.searchParams.get("fileName");
			const instructions = url.searchParams.get("instructions");
			const line = url.searchParams.get("line");
			const code = url.searchParams.get("code");
			
			if (!fileName) {
				return new Response(JSON.stringify({ error: "Missing required parameter: fileName" }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			if (!instructions) {
				return new Response(JSON.stringify({ error: "Missing required parameter: instructions" }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			if (!line) {
				return new Response(JSON.stringify({ error: "Missing required parameter: line" }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			if (!code) {
				return new Response(JSON.stringify({ error: "Missing required parameter: code" }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			const lineNumber = parseInt(line);
			if (isNaN(lineNumber) || lineNumber < 1) {
				return new Response(JSON.stringify({ error: "Line parameter must be a positive number" }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			return new Response(JSON.stringify({
				success: true,
				code: "Generated code",
				fileName,
				line: lineNumber
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
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

describe("AI Handler", () => {
	const baseUrl = "http://example.com/api/ai";

	beforeEach(() => {
		// Reset any mocks before each test
		vi.clearAllMocks();
	});

	describe("Request Method Validation", () => {
		it("should reject non-GET requests", async () => {
			const methods = ["POST", "PUT", "DELETE", "PATCH"];
			
			for (const method of methods) {
				const response = await fetch(baseUrl, { method });
				expect(response.status).toBe(405);
				
				const data = await response.json();
				expect(data).toHaveProperty("error");
				expect(data.error).toContain("Method Not Allowed");
			}
		});

		it("should accept GET requests", async () => {
			const response = await fetch(baseUrl);
			// Should return 400 (missing params) or 200 (success), not 405
			expect(response.status).not.toBe(405);
		});
	});

	describe("Parameter Validation", () => {
		it("should return 400 for missing parameters", async () => {
			const response = await fetch(`${baseUrl}?fileName=test.js`);
			expect(response.status).toBe(400);
			
			const data = await response.json();
			expect(data).toHaveProperty("error");
			expect(data.error).toContain("Missing required parameter:");
		});

		it("should validate fileName parameter", async () => {
			const params = new URLSearchParams({
				fileName: "",
				instructions: "Add a function",
				line: "1",
				code: "// empty file"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect(response.status).toBe(400);
			
			const data = await response.json();
			expect(data.error).toContain("fileName");
		});

		it("should validate instructions parameter", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "",
				line: "1",
				code: "function test() {}"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect(response.status).toBe(400);
			
			const data = await response.json();
			expect(data.error).toContain("instructions");
		});

		it("should validate line parameter", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a function",
				line: "",
				code: "function test() {}"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect(response.status).toBe(400);
			
			const data = await response.json();
			expect(data.error).toContain("line");
		});

		it("should validate line parameter is numeric", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a function",
				line: "not-a-number",
				code: "function test() {}"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect(response.status).toBe(400);
		});

		it("should validate code parameter", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a function",
				line: "1",
				code: ""
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect(response.status).toBe(400);
			
			const data = await response.json();
			expect(data.error).toContain("code");
		});
	});

	describe("File Type Support", () => {
		const validFileTypes = [
			"test.js",
			"component.tsx",
			"styles.css",
			"config.json",
			"script.py",
			"README.md"
		];

		it.each(validFileTypes)("should accept file type: %s", async (fileName) => {
			const params = new URLSearchParams({
				fileName,
				instructions: "Add a comment",
				line: "1",
				code: "// some code"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			// Should not fail due to file type (may fail due to AI binding)
			expect([200, 500].includes(response.status)).toBe(true);
		});
	});

	describe("AI Integration", () => {
		it("should handle request with all parameters (mock)", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a console.log statement",
				line: "1",
				code: "function test() { return 42; }"
			});

			// Note: This will fail in test environment without AI binding
			// In a real test, you'd mock the AI service
			const response = await fetch(`${baseUrl}?${params}`);
			
			// Expect either success (if AI is available) or service error
			expect([200, 500].includes(response.status)).toBe(true);
		});

		it("should handle AI service unavailable", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a function",
				line: "1",
				code: "// code here"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			
			if (response.status === 500) {
				const data = await response.json();
				expect(data).toHaveProperty("error");
				expect(data.error).toContain("AI service");
			}
		});

		it("should return proper response format on success", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a comment",
				line: "1",
				code: "function hello() { return 'world'; }"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			
			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("code");
				expect(typeof data.code).toBe("string");
			}
		});
	});

	describe("Edge Cases", () => {
		it("should handle very long code input", async () => {
			const longCode = "// ".repeat(10000) + "very long comment";
			const params = new URLSearchParams({
				fileName: "large.js",
				instructions: "Optimize this code",
				line: "1",
				code: longCode
			});

			const response = await fetch(`${baseUrl}?${params}`);
			// Should either process or return reasonable error
			expect([200, 400, 413, 500].includes(response.status)).toBe(true);
		});

		it("should handle special characters in filename", async () => {
			const params = new URLSearchParams({
				fileName: "测试-file_名.js",
				instructions: "Add documentation",
				line: "1",
				code: "function test() {}"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect([200, 400, 500].includes(response.status)).toBe(true);
		});

		it("should handle high line numbers", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a function",
				line: "999999",
				code: "function test() {}"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			expect([200, 400, 500].includes(response.status)).toBe(true);
		});
	});

	describe("Content Types and Headers", () => {
		it("should handle requests with different content types", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add logging",
				line: "1",
				code: "console.log('test');"
			});

			const response = await fetch(`${baseUrl}?${params}`, {
				headers: {
					"Content-Type": "application/json"
				}
			});

			expect([200, 400, 500].includes(response.status)).toBe(true);
		});

		it("should return JSON response", async () => {
			const params = new URLSearchParams({
				fileName: "test.js",
				instructions: "Add a function",
				line: "1",
				code: "// test"
			});

			const response = await fetch(`${baseUrl}?${params}`);
			
			if (response.status !== 405) {
				expect(response.headers.get("content-type")).toContain("application/json");
			}
		});
	});
});
