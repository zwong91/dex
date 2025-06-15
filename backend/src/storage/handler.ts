import { z } from "zod";
import { json } from "itty-router-extras";
import startercode from "./startercode";
import type { Env } from '../index';

export async function storageHandler(request: Request, env: Env): Promise<Response> {
	const success = new Response("Success", { status: 200 });
	const invalidRequest = new Response("Invalid Request", { status: 400 });
	const notFound = new Response("Not Found", { status: 404 });

	// Authentication check
	if (request.headers.get("Authorization") !== env.KEY) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	// Check if R2 binding is available
	if (!env.R2) {
		return json({ error: "Storage service not available in development environment" }, { status: 503 });
	}

	const url = new URL(request.url);
	const pathname = url.pathname;
	const method = request.method;

	try {
		// Project operations
		if (pathname.endsWith('/project')) {
			if (method === "DELETE") {
				const deleteSchema = z.object({
					sandboxId: z.string(),
				});

				const body = await request.json();
				const { sandboxId } = deleteSchema.parse(body);

				const res = await env.R2!.list({ prefix: "projects/" + sandboxId });
				await Promise.all(
					res.objects.map(async (file) => {
						await env.R2!.delete(file.key);
					})
				);

				return json({ success: true, message: "Project deleted" });
			} else {
				return json({ error: "Method not allowed" }, { status: 405 });
			}
		}
		
		// Size operations
		else if (pathname.endsWith('/size')) {
			if (method === "GET") {
				const params = url.searchParams;
				const sandboxId = params.get("sandboxId");

				if (!sandboxId) {
					return json({ error: "Missing required parameter: sandboxId" }, { status: 400 });
				}

				const res = await env.R2!.list({ prefix: `projects/${sandboxId}` });
				let size = 0;
				for (const file of res.objects) {
					size += file.size;
				}
				return json({ success: true, size });
			} else {
				return json({ error: "Method not allowed" }, { status: 405 });
			}
		}
		
		// File operations  
		else if (pathname.endsWith('/file')) {
			if (method === "GET") {
				const params = url.searchParams;
				const sandboxId = params.get("sandboxId");
				const path = params.get("path");

				if (!sandboxId || !path) {
					return json({ error: "Missing required parameters: sandboxId, path" }, { status: 400 });
				}

				const fileId = `projects/${sandboxId}/${path}`;
				const obj = await env.R2!.get(fileId);
				if (obj === null) {
					return json({ error: `File not found: ${path}` }, { status: 404 });
				}
				
				const text = await obj.text();
				return json({ success: true, content: text, path });
			} else {
				return json({ error: "Method not allowed" }, { status: 405 });
			}
		}
		
		// Create operations
		else if (pathname.endsWith('/create')) {
			if (method === "POST") {
				const initSchema = z.object({
					sandboxId: z.string(),
					type: z.enum(["react", "node"]),
				});

				const body = await request.json();
				const { sandboxId, type } = initSchema.parse(body);

				await Promise.all(
					startercode[type].map(async (file) => {
						await env.R2!.put(`projects/${sandboxId}/${file.name}`, file.body);
					})
				);

				return json({ success: true, message: "Project created", sandboxId, type });
			} else {
				return json({ error: "Method not allowed" }, { status: 405 });
			}
		}
		
		// Rename operations
		else if (pathname.endsWith('/rename')) {
			if (method === "PUT") {
				const renameSchema = z.object({
					sandboxId: z.string(),
					oldPath: z.string(),
					newPath: z.string(),
				});

				const body = await request.json();
				const { sandboxId, oldPath, newPath } = renameSchema.parse(body);

				const oldFileId = `projects/${sandboxId}/${oldPath}`;
				const newFileId = `projects/${sandboxId}/${newPath}`;
				
				// Get the old file
				const obj = await env.R2!.get(oldFileId);
				if (obj === null) {
					return json({ error: `File not found: ${oldPath}` }, { status: 404 });
				}
				
				// Copy to new location
				await env.R2!.put(newFileId, obj.body);
				
				// Delete old file
				await env.R2!.delete(oldFileId);

				return json({ success: true, message: "File renamed", oldPath, newPath });
			} else {
				return json({ error: "Method not allowed" }, { status: 405 });
			}
		}
		
		else {
			return json({ error: "Not found" }, { status: 404 });
		}
	} catch (error) {
		console.error('Storage error:', error);
		if (error instanceof z.ZodError) {
			return json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
		}
		if (error instanceof SyntaxError) {
			return json({ error: 'Invalid JSON in request body' }, { status: 400 });
		}
		return json({ error: 'Storage service error' }, { status: 500 });
	}
}
