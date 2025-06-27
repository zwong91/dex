import { Hono } from 'hono';
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// 统一使用全局 Env 类型
import type { Env } from '../index';
import type { DurableObjectState } from '@cloudflare/workers-types';


// Define the D1Agent class that extends McpAgent, configured as a Durable Object
export class D1Agent extends McpAgent {
  // Define the server instance
  // This server will handle the MCP requests and provide tools for calculations and user searches
  server = new McpServer({
    name: "d1-agent",
    description: "A D1 database agent that provides various tools for calculations and user searches.",
    version: "1.0.0",
  });

  // 将 env 作为实例属性，在构造函数中注入
  protected env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.env = env;
  }

  async init() {
    // Calculator tool with multiple operations
    this.server.tool(
      "calculate",
      "Performs basic arithmetic operations (add, subtract, multiply, divide) on two numbers.",
      {
        operation: z.enum(["add", "subtract", "multiply", "divide"]),
        a: z.number().describe("The first operand for the calculation."),
        b: z.number().describe("The second operand for the calculation."),
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

    // 用户数量统计工具
    this.server.tool(
      "userCount",
      "Returns the total number of registered users.",
      {},
      async () => {
        const { results } = await this.env.D1_DATABASE.prepare(
          "SELECT COUNT(*) as userCount FROM users"
        ).all();
        const count = results[0]?.userCount ?? 0;
        return {
          content: [
            {
              type: "text",
              text: `当前注册用户数：${count}`,
            },
          ],
        };
      }
    );

    // User search tool（支持多条件筛选）
    this.server.tool(
      "searchUsers",
      "Searches users in the database with flexible filters such as username, email, age, and location.",
      {
        query: z.string().optional().describe("A general search string to match username, email, or location."),
        username: z.string().optional().describe("Filter users by username (supports partial match)."),
        email: z.string().optional().describe("Filter users by email (supports partial match)."),
        minAge: z.number().min(0).optional().describe("Minimum age of users to include in the results."),
        maxAge: z.number().min(0).optional().describe("Maximum age of users to include in the results."),
        location: z.string().optional().describe("Filter users by location (supports partial match)."),
        limit: z.number().min(1).max(50).optional().describe("Maximum number of users to return (default 20, max 50)."),
      },
      async (params: {
        query?: string;
        username?: string;
        email?: string;
        minAge?: number;
        maxAge?: number;
        location?: string;
        limit?: number;
      }) => {
        // 直接使用 this.env，不再需要从 extra 参数中获取
        let sql = 'SELECT id, username, email FROM users';
        const conditions: string[] = [];
        const values: any[] = [];

        if (params.query) {
          conditions.push('(username LIKE ? OR email LIKE ?)');
          values.push(`%${params.query}%`, `%${params.query}%`);
        }
        if (params.username) {
          conditions.push('username LIKE ?');
          values.push(`%${params.username}%`);
        }
        if (params.email) {
          conditions.push('email LIKE ?');
          values.push(`%${params.email}%`);
        }
        // 移除 location 相关条件

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' ORDER BY id DESC';
        sql += ` LIMIT ?`;
        values.push(params.limit ?? 20);

        // 调试日志
        console.log('User search SQL:', sql);
        console.log('User search params:', values);

        // Execute query using this.env
        const { results } = await this.env.D1_DATABASE.prepare(sql)
          .bind(...values)
          .all();

        // Prepare the context for the LLM
        const context = results.map((user: any) =>
          `ID: ${user.id}\nUsername: ${user.username}\nEmail: ${user.email}`
        ).join('\n\n');

        // Generate prompt for the LLM
        const prompt = `Here are the users matching your search conditions:\n\n${context}\n\nPlease summarize these users, listing their username and email. If there are multiple users, highlight the most relevant ones based on the search.`;

        // Call the LLM with the context using this.env
        const messages = [
          { role: "system", content: "You are a helpful assistant that provides detailed information about users. Focus on providing comprehensive summaries that include name, email, age, and relevant context." },
          { role: "user", content: prompt },
        ];

        const model = '@cf/mistralai/mistral-small-3.1-24b-instruct';
        const response = await this.env.AI.run(model, { messages });

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
