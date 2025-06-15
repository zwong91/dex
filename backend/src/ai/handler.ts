import { json } from 'itty-router-extras';
import type { Env } from '../index';

export async function aiHandler(request: Request, env: Env): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method Not Allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const fileName = url.searchParams.get("fileName");
	const instructions = url.searchParams.get("instructions");
	const line = url.searchParams.get("line");
	const code = url.searchParams.get("code");

	// Validate required parameters
	if (!fileName) {
		return json({ error: "Missing required parameter: fileName" }, { status: 400 });
	}
	if (!instructions) {
		return json({ error: "Missing required parameter: instructions" }, { status: 400 });
	}
	if (!line) {
		return json({ error: "Missing required parameter: line" }, { status: 400 });
	}
	if (!code) {
		return json({ error: "Missing required parameter: code" }, { status: 400 });
	}

	// Validate line parameter is numeric
	const lineNumber = parseInt(line);
	if (isNaN(lineNumber) || lineNumber < 1) {
		return json({ error: "Line parameter must be a positive number" }, { status: 400 });
	}

	// Check if AI binding is available
	if (!env.AI) {
		return json({ error: "AI service not available in development environment" }, { status: 503 });
	}

	try {
		const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
			messages: [
				{
					role: "system",
					content:
						"You are an expert coding assistant. You read code from a file, and you suggest new code to add to the file. You may be given instructions on what to generate, which you should follow. You should generate code that is CORRECT, efficient, and follows best practices. You may generate multiple lines of code if necessary. When you generate code, you should ONLY return the code, and nothing else. You MUST NOT include backticks in the code you generate.",
				},
				{
					role: "user",
					content: `The file is called ${fileName}.`,
				},
				{
					role: "user",
					content: `Here are my instructions on what to generate: ${instructions}.`,
				},
				{
					role: "user",
					content: `Suggest me code to insert at line ${line} in my file. Give only the code, and NOTHING else. DO NOT include backticks in your response. My code file content is as follows 
          
${code}`,
				},
			],
		});

		return json({
			success: true,
			code: response.response || "// AI generated code",
			fileName,
			line: lineNumber
		});
	} catch (error) {
		console.error('AI Error:', error);
		return json({ error: 'AI service error' }, { status: 500 });
	}
}
