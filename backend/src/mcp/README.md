# Building a Remote MCP Server on Cloudflare

This example allows you to deploy a remote MCP server that doesn't require authentication on Cloudflare Workers. This MCP server allows you to chat with your D1 SQL database--you can connect it to VS Code, the [Workers AI LLM Playground](https://playground.ai.cloudflare.com/), Claude, and more clients! Accenctuate your AI coding IDE by giving LLMs access to your database.

## Get started

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp)

This will deploy your MCP server to a URL like: `remote-mcp-server.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:

```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp
```

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/mcp/index.ts` using `this.server.tool(...)`.

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to <https://playground.ai.cloudflare.com/>
2. Enter your deployed MCP server URL (`remote-mcp-server.<your-account>.workers.dev/sse`)
3. You can now use your MCP tools directly from the playground!

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

Update with this configuration:

```json
{
  "mcpServers": {
    "d1-agent": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"  // or remote-mcp-server.your-account.workers.dev/sse
      ]
    }
  }
}
```

VS Code Settings .vscode/mcp.json

```json
{
    "servers": {
        "d1-agent": {
            "type": "sse",
            "command": "npx",
            "args": [
                "mcp-remote",
                "http://localhost:8787/sse"// or remote-mcp-server.your-account.workers.dev/sse
            ]
        }
    }
}
```

Restart Claude and you should see the tools become available.
