import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequestHandler } from "react-router";
import { registerBrowseTableTool } from "./tools/show_grid.js";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "mcpUIServer",
    version: "1.0.0",
  });

  async init() {
    const requestUrl = this.props?.requestUrl as string;
    const url = new URL(requestUrl);
    const requestHost = url.host;

    registerBrowseTableTool(this.server, requestHost);
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);
    ctx.props.requestUrl = request.url;

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
};
