import { Hono } from 'hono';
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// 统一使用全局 Env 类型
import type { Env } from '../index';

export class D1Agent extends McpAgent {
  // Define the server instance
  // This server will handle the MCP requests and provide tools for calculations and user searches
  server = new McpServer({
    name: "d1-agent",
    description: "A D1 database agent that provides various tools for calculations and user searches.",
    version: "1.0.0",
  });

  async init() {
    // Calculator tool with multiple operations
    this.server.tool(
      "calculate",
      {
        operation: z.enum(["add", "subtract", "multiply", "divide"]),
        a: z.number(),
        b: z.number(),
      },
      async ({ operation, a, b }) => {
        let result: number;
        switch (operation) {
          case "add":
            result = a + b;
            break;
          case "subtract":
            result = a - b;
            break;
          case "multiply":
            result = a * b;
            break;
          case "divide":
            if (b === 0)
              return {
                content: [
                  {
                    type: "text",
                    text: "Error: Cannot divide by zero",
                  },
                ],
              };
            result = a / b;
            break;
        }
        return { content: [{ type: "text", text: String(result) }] };
      }
    );

    // User search tool（支持多条件筛选）
    this.server.tool(
      "searchUsers",
      {
        query: z.string().optional(),
        username: z.string().optional(),
        email: z.string().optional(),
        minAge: z.number().min(0).optional(),
        maxAge: z.number().min(0).optional(),
        location: z.string().optional(),
        limit: z.number().min(1).max(50).optional(),
      },
      async (params: {
        query?: string;
        username?: string;
        email?: string;
        minAge?: number;
        maxAge?: number;
        location?: string;
        limit?: number;
      }, extra: any) => {
        const env: Env = extra.env ?? (extra?.request?.env ?? {});
        let sql = 'SELECT id, username, email, age, location FROM users';
        const conditions: string[] = [];
        const values: any[] = [];

        if (params.query) {
          conditions.push('(username LIKE ? OR email LIKE ? OR location LIKE ?)');
          values.push(`%${params.query}%`, `%${params.query}%`, `%${params.query}%`);
        }
        if (params.username) {
          conditions.push('username LIKE ?');
          values.push(`%${params.username}%`);
        }
        if (params.email) {
          conditions.push('email LIKE ?');
          values.push(`%${params.email}%`);
        }
        if (params.location) {
          conditions.push('location LIKE ?');
          values.push(`%${params.location}%`);
        }
        if (params.minAge !== undefined) {
          conditions.push('age >= ?');
          values.push(params.minAge);
        }
        if (params.maxAge !== undefined) {
          conditions.push('age <= ?');
          values.push(params.maxAge);
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' ORDER BY id DESC';
        sql += ` LIMIT ?`;
        values.push(params.limit ?? 20);

        // 调试日志
        console.log('User search SQL:', sql);
        console.log('User search params:', values);

        // Execute query
        const { results } = await env.D1_DATABASE.prepare(sql)
          .bind(...values)
          .all();


        // Prepare the context for the LLM
        const context = results.map((user: any) =>
          `ID: ${user.id}\nUsername: ${user.username}\nEmail: ${user.email}\nAge: ${user.age ?? '-'}\nLocation: ${user.location ?? '-'}`
        ).join('\n\n');

        // Generate prompt for the LLM
        const prompt = `Here are the users matching your search conditions:\n\n${context}\n\nPlease summarize these users, listing their username, email, age, and location. If there are multiple users, highlight the most relevant ones based on the search.`;

        // Call the LLM with the context
        const messages = [
          { role: "system", content: "You are a helpful assistant that provides detailed information about users. Focus on providing comprehensive summaries that include name, email, age, and relevant context." },
          { role: "user", content: prompt },
        ];

        const model = '@cf/mistralai/mistral-small-3.1-24b-instruct';
        const response = await env.AI.run(model, { messages });

        return {
          content: [
            {
              type: "text",
              text: typeof response === 'string' ? response : JSON.stringify(response),
            },
          ],
        };
      }
    );
  }
}